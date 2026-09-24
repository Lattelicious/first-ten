import { getChatGPTUser } from "@/app/chatgpt-auth";
import { config, database, AppError, isOwner } from "@/lib/server/env";
import { publicRun, ownedRun, createRun, initializeBudgets, type Row } from "@/lib/server/store";
import { runInputSchema } from "@/lib/server/schemas";
import {
  advance,
  cancelRun,
  deleteProviderRecord,
} from "@/lib/server/research";
import { saveUpload, importDataset, MAX_FILE } from "@/lib/server/uploads";
import { boundedRequest } from "@/lib/server/request-body";
import { exampleRun } from "@/lib/examples";
import type { Route } from "@/lib/types";
import { exportCsv } from "@/lib/validation";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function handle(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const action = path.join("/");
    const user = await getChatGPTUser();
    if (req.method === "GET" && action === "session")
      return reply({
        user: user
          ? {
              name: user.displayName,
              id: user.userId,
              owner: isOwner(user.userId),
            }
          : null,
        live:
          !!config().OPENAI_API_KEY &&
          config().LIVE_RESEARCH_ENABLED === "true",
        denue: !!config().DENUE_API_TOKEN,
      });
    if (
      req.method === "GET" &&
      path[0] === "examples" &&
      path.length === 3 &&
      path[2] === "export" &&
      ["monitoring", "procedures"].includes(path[1])
    ) {
      const route = new URL(req.url).searchParams.get("route") ?? "tenders";
      if (!["tenders", "physicians", "institutions"].includes(route))
        throw new AppError("Unknown example route.");
      const sample = exampleRun(
        path[1] as "monitoring" | "procedures",
        route as Route,
      );
      return new Response(exportCsv(sample.results), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="first-ten-' +
            path[1] +
            "-" +
            route +
            '.csv"',
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (!user)
      throw new AppError("Sign in with ChatGPT to use private research.", 401);
    const owner = user.userId,
      db = database();
    if (req.method !== "GET") {
      const origin = req.headers.get("origin");
      if (
        !origin ||
        (origin !== new URL(req.url).origin &&
          origin !== config().PUBLIC_ORIGIN)
      )
        throw new AppError(
          "This request must come from the First Ten workspace.",
          403,
        );
      const size = Number(req.headers.get("content-length") ?? 0);
      if (size > MAX_FILE + 65536)
        throw new AppError("This request is too large.", 413);
      req = await boundedRequest(
        req,
        action === "uploads"
          ? MAX_FILE + 65536
          : action === "admin/datasets"
            ? 2 * 1024 * 1024 + 65536
            : 100000,
      );
    }
    if (req.method === "GET" && action === "runs") {
      const rows = await db
        .prepare(
          "SELECT * FROM runs WHERE owner=? ORDER BY created_at DESC LIMIT 30",
        )
        .bind(owner)
        .all<Row>();
      return reply({ runs: rows.results.map(publicRun) });
    }
    if (req.method === "GET" && action === "catalogs")
      return reply(
        await db
          .prepare(
            "SELECT id,name,created_at FROM catalogs WHERE owner=? ORDER BY created_at DESC",
          )
          .bind(owner)
          .all(),
      );
    if (req.method === "POST" && action === "uploads") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new AppError("Choose a catalog file.");
      return reply(await saveUpload(file, owner), 201);
    }
    if (req.method === "POST" && action === "runs") {
      if (!config().OPENAI_API_KEY || config().LIVE_RESEARCH_ENABLED !== "true")
        throw new AppError(
          "Live research is not enabled yet. Explore either saved example while the connection is configured.",
          503,
        );
      const raw = await req.text();
      if (raw.length > 100000)
        throw new AppError("This catalog selection is too large.", 413);
      const input = runInputSchema.parse(JSON.parse(raw));
      if (
        input.catalogId &&
        !(await db
          .prepare("SELECT id FROM catalogs WHERE id=? AND owner=?")
          .bind(input.catalogId, owner)
          .first())
      )
        throw new AppError("Catalog not found.", 404);
      return reply(publicRun(await createRun(owner, input)), 201);
    }
    if (path[0] === "runs" && path[1]) {
      let row = await ownedRun(path[1], owner);
      if (req.method === "POST" && path[2] === "advance") {
        await advance(row);
        row = await ownedRun(row.id, owner);
        return reply(publicRun(row));
      }
      if (req.method === "POST" && path[2] === "cancel") {
        if (["queued", "researching", "verifying"].includes(row.status))
          await cancelRun(row);
        return reply(publicRun(await ownedRun(row.id, owner)));
      }
      if (req.method === "GET" && path[2] === "export") {
        return new Response(exportCsv(JSON.parse(row.results_json)), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="first-ten-' + row.id + '.csv"',
            "Cache-Control": "private, no-store",
          },
        });
      }
      if (req.method === "GET") return reply(publicRun(row));
      if (req.method === "DELETE" && path.length === 2) {
        if (["queued", "researching", "verifying"].includes(row.status))
          await cancelRun(row);
        await deleteProviderRecord(await ownedRun(row.id, owner));
        await db
          .prepare("DELETE FROM runs WHERE id=? AND owner=?")
          .bind(row.id, owner)
          .run();
        return reply({ deleted: true });
      }
    }
    if (path[0] === "catalogs" && path[1] && req.method === "DELETE") {
      const cat = await db
        .prepare("SELECT * FROM catalogs WHERE id=? AND owner=?")
        .bind(path[1], owner)
        .first<{ id: string; file_key: string }>();
      if (!cat) throw new AppError("Catalog not found.", 404);
      const related = await db
        .prepare(
          "SELECT * FROM runs WHERE owner=? AND json_extract(input_json,'$.catalogId')=?",
        )
        .bind(owner, cat.id)
        .all<Row>();
      for (const row of related.results) {
        if (["queued", "researching", "verifying"].includes(row.status))
          await cancelRun(row);
        await deleteProviderRecord(await ownedRun(row.id, owner));
      }
      if (cat.file_key) {
        if (!config().BUCKET)
          throw new AppError(
            "File storage is temporarily unavailable. Please retry deletion.",
            503,
          );
        await config().BUCKET!.delete(cat.file_key);
      }
      await db.batch([
        db
          .prepare(
            "DELETE FROM runs WHERE owner=? AND json_extract(input_json,'$.catalogId')=?",
          )
          .bind(owner, cat.id),
        db
          .prepare("DELETE FROM catalogs WHERE id=? AND owner=?")
          .bind(cat.id, owner),
      ]);
      return reply({ deleted: true });
    }
    if (path[0] === "admin") {
      if (!isOwner(owner))
        throw new AppError("This is an owner-only operation.", 403);
      if (req.method === "GET" && path[1] === "status") {
        await initializeBudgets();
        return reply({
          budgets: (await db.prepare("SELECT * FROM budgets").all()).results,
          datasets: (
            await db
              .prepare("SELECT * FROM datasets ORDER BY imported_at DESC")
              .all()
          ).results,
        });
      }
      if (req.method === "POST" && path[1] === "datasets") {
        const form = await req.formData();
        const file = form.get("file");
        const kind = String(form.get("kind"));
        if (!(file instanceof File) || !["procurement", "denue"].includes(kind))
          throw new AppError("Choose a procurement or DENUE CSV.");
        return reply(
          await importDataset(
            file,
            kind,
            String(form.get("sourceUrl")),
            String(form.get("datasetDate")),
          ),
          201,
        );
      }
    }
    throw new AppError("Not found.", 404);
  } catch (e) {
    if (e instanceof AppError) return reply({ error: e.message }, e.status);
    if (
      e instanceof SyntaxError ||
      (e instanceof Error && e.name === "ZodError")
    )
      return reply(
        {
          error:
            "Some inputs could not be read. Review your catalog and market selection.",
        },
        400,
      );
    console.error(
      "First Ten request failed:",
      e instanceof Error ? e.name : "unknown",
    );
    return reply(
      {
        error:
          "This operation is temporarily unavailable. Your input has been kept so you can retry.",
      },
      503,
    );
  }
}
export const GET = handle,
  POST = handle,
  DELETE = handle;
