import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { exampleRun } from "../lib/examples";

let mf: Miniflare;
let db: D1Database;
let requests = 0;
let providerFailure = false;
const fixture = exampleRun("procedures").results[0];
const input = exampleRun("procedures").input;
const providerRecords = new Map<string, boolean>();
before(async () => {
  const bundled = await build({
    stdin: {
      contents: `import {AsyncLocalStorage} from 'node:async_hooks';import {GET} from './app/api/[...path]/route';import {context} from 'test-context';export default {fetch(request){return context.run(request,()=>GET(request,{params:Promise.resolve({path:new URL(request.url).pathname.slice(5).split('/')})}));}};`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: "neutral",
    format: "esm",
    conditions: ["worker", "browser"],
    external: ["cloudflare:workers", "node:*", "@napi-rs/canvas"],
    plugins: [
      {
        name: "test-next-request-context",
        setup(b) {
          b.onResolve(
            { filter: /^(next\/headers|next\/navigation|test-context)$/ },
            (args) => ({ path: args.path, namespace: "test" }),
          );
          b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
            contents:
              args.path === "test-context"
                ? `import {AsyncLocalStorage} from 'node:async_hooks';export const context=new AsyncLocalStorage();`
                : args.path === "next/headers"
                  ? `import {context} from 'test-context';export async function headers(){return context.getStore().headers;}`
                  : `export function redirect(){throw new Error('Redirect outside test scope');}`,
            loader: "js",
          }));
        },
      },
    ],
  });
  mf = new Miniflare({
    modules: true,
    script: bundled.outputFiles[0].text,
    compatibilityDate: "2026-05-22",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    r2Buckets: ["BUCKET"],
    bindings: {
      OWNER_USER_ID: "owner-test",
      OPENAI_API_KEY: "test-placeholder-not-a-real-key",
      LIVE_RESEARCH_ENABLED: "true",
      PUBLIC_ORIGIN: "https://first-ten.test",
    },
    outboundService: async (req) => {
      requests++;
      assert.equal(new URL(req.url).hostname, "api.openai.com");
      if (providerFailure)
        return new Response("Temporarily unavailable", { status: 503 });
      if (req.method === "DELETE") return Response.json({ deleted: true });
      if (req.method === "POST" && req.url.endsWith("/cancel"))
        return Response.json({
          id: "cancelled",
          status: "cancelled",
          usage: { input_tokens: 100, output_tokens: 20 },
          output: [],
        });
      if (req.method === "POST") {
        const body = (await req.json()) as { text?: unknown };
        const id = "response-" + requests;
        providerRecords.set(id, !!body.text);
        return Response.json({ id, status: "queued" });
      }
      const id = req.url.split("/").at(-1)!;
      return Response.json({
        id,
        status: "completed",
        usage: { input_tokens: 1000, output_tokens: 500 },
        output: [
          {
            type: "web_search_call",
            action: { sources: fixture.evidence.map((e) => ({ url: e.url })) },
          },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: providerRecords.get(id)
                  ? JSON.stringify({
                      opportunities: [fixture],
                      limitations: ["Test fixture, not live research"],
                    })
                  : "Research dossier supported by " + fixture.evidence[0].url,
              },
            ],
          },
        ],
      });
    },
  });
  db = (await mf.getD1Database("DB")) as unknown as D1Database;
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of (await readFile("drizzle/" + file, "utf8"))
      .split("--> statement-breakpoint")
      .map((x) => x.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
});
after(async () => {
  await mf?.dispose();
});
async function call(
  path: string,
  user = "owner-test",
  method = "GET",
  body?: unknown,
  origin = "https://first-ten.test",
) {
  const headers: Record<string, string> = {};
  if (user) {
    headers["oai-authenticated-user-id"] = user;
    headers["oai-authenticated-user-email"] = user + "@example.test";
  }
  if (method !== "GET") headers.origin = origin;
  if (body && !(body instanceof FormData))
    headers["content-type"] = "application/json";
  const request = new Request("https://first-ten.test/api/" + path, {
    method,
    headers,
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return mf.dispatchFetch(request.url, {
    method,
    headers: Object.fromEntries(request.headers),
    body:
      method === "GET"
        ? undefined
        : new Uint8Array(await request.arrayBuffer()),
  });
}
async function start(user: string) {
  const r = await call("runs", user, "POST", input);
  return {
    status: r.status,
    data: (await r.json()) as {
      id: string;
      status: string;
      error?: string;
      results: unknown[];
      costUsd: number;
    },
  };
}
async function ready(id: string) {
  await db
    .prepare(
      "UPDATE runs SET updated_at='2020-01-01T00:00:00Z',lease_until=0 WHERE id=?",
    )
    .bind(id)
    .run();
}
async function step(id: string, user = "owner-test") {
  await ready(id);
  const r = await call("runs/" + id + "/advance", user, "POST");
  return (await r.json()) as {
    id: string;
    status: string;
    results: unknown[];
    costUsd: number;
  };
}
async function cancel(id: string, user: string) {
  await ready(id);
  return call("runs/" + id + "/cancel", user, "POST");
}

test("signed-out access and foreign-origin writes are rejected", async () => {
  assert.equal((await call("runs", "")).status, 401);
  assert.equal(
    (await call("runs", "owner-test", "POST", input, "https://evil.example"))
      .status,
    403,
  );
  const s = (await (await call("session", "")).json()) as { user: unknown };
  assert.equal(s.user, null);
});
test("concurrent creation enforces one active run and daily quota", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, () => start("visitor-a")),
  );
  assert.equal(results.filter((x) => x.status === 201).length, 1);
  assert.equal(results.filter((x) => x.status === 429).length, 7);
  const id = results.find((x) => x.status === 201)!.data.id;
  assert.equal((await cancel(id, "visitor-a")).status, 200);
  assert.equal((await start("visitor-a")).status, 429);
});
test("research ownership applies to read, advance, cancel, export and deletion", async () => {
  const { data } = await start("visitor-b");
  for (const [tail, method] of [
    ["", "GET"],
    ["/advance", "POST"],
    ["/cancel", "POST"],
    ["/export", "GET"],
    ["", "DELETE"],
  ])
    assert.equal(
      (await call("runs/" + data.id + tail, "visitor-c", method)).status,
      404,
    );
  assert.equal((await call("admin/status", "visitor-b")).status, 403);
  await cancel(data.id, "visitor-b");
});
test("two research stages survive reload and publish validated output", async () => {
  const { data, status } = await start("owner-test");
  assert.equal(status, 201);
  assert.equal((await step(data.id)).status, "researching");
  const reloaded = (await (await call("runs/" + data.id)).json()) as {
    status: string;
  };
  assert.equal(reloaded.status, "researching");
  assert.equal((await step(data.id)).status, "verifying");
  assert.equal((await step(data.id)).status, "verifying");
  const done = await step(data.id);
  assert.equal(done.status, "complete");
  assert.equal(done.results.length, 1);
  assert.ok(done.costUsd > 0);
  assert.ok(done.costUsd < 2);
  const exported = await call("runs/" + data.id + "/export");
  assert.equal(exported.status, 200);
  assert.match(await exported.text(), /Jorge/);
  const before = await db
    .prepare("SELECT * FROM budgets WHERE pool='owner'")
    .first();
  assert.equal(
    (await call("runs/" + data.id, "owner-test", "DELETE")).status,
    200,
  );
  assert.equal((await call("runs/" + data.id)).status, 404);
  assert.deepEqual(
    await db.prepare("SELECT * FROM budgets WHERE pool='owner'").first(),
    before,
  );
});
test("uploads are private and deletion removes R2 bytes", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File(["product,use\nLaparoscopic trocar,surgery"], "catalog.csv", {
      type: "text/csv",
    }),
  );
  const uploaded = await call("uploads", "upload-owner", "POST", form);
  assert.equal(uploaded.status, 201);
  const value = (await uploaded.json()) as { id: string; text: string };
  assert.match(value.text, /trocar/);
  const bucket = await mf.getR2Bucket("BUCKET");
  assert.ok(await bucket.head("upload-owner/" + value.id));
  const others = (await (await call("catalogs", "other")).json()) as {
    results: unknown[];
  };
  assert.equal(others.results.length, 0);
  assert.equal(
    (await call("catalogs/" + value.id, "other", "DELETE")).status,
    404,
  );
  assert.equal(
    (await call("catalogs/" + value.id, "upload-owner", "DELETE")).status,
    200,
  );
  assert.equal(await bucket.head("upload-owner/" + value.id), null);
});
test("unreadable and oversized uploads fail without private records", async () => {
  for (const [name, text] of [
    ["broken.pdf", "not a PDF"],
    ["broken.csv", '"unclosed'],
    ["wrong.exe", "some products"],
  ]) {
    const form = new FormData();
    form.set("file", new File([text], name));
    assert.equal(
      (await call("uploads", "bad-upload", "POST", form)).status,
      400,
    );
  }
  const huge = new FormData();
  huge.set(
    "file",
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.csv"),
  );
  assert.equal((await call("uploads", "bad-upload", "POST", huge)).status, 400);
  const records = (await (await call("catalogs", "bad-upload")).json()) as {
    results: unknown[];
  };
  assert.equal(records.results.length, 0);
});
test("provider failure stays visible, does not invent results, and settles once", async () => {
  providerFailure = true;
  const { data } = await start("owner-test");
  const result = await step(data.id);
  assert.equal(result.status, "failed");
  assert.equal(result.results.length, 0);
  providerFailure = false;
  const b = await db
    .prepare("SELECT * FROM budgets WHERE pool='owner'")
    .first();
  await step(data.id);
  assert.deepEqual(
    await db.prepare("SELECT * FROM budgets WHERE pool='owner'").first(),
    b,
  );
});
test("concurrent visitor reservations never exceed the shared pool", async () => {
  await db
    .prepare(
      "UPDATE budgets SET limit_micros=4000000,spent_micros=0,reserved_micros=0 WHERE pool='visitors'",
    )
    .run();
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) => start("budget-" + i)),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 2);
  assert.equal(results.filter((r) => r.status === 429).length, 6);
  const budget = await db
    .prepare("SELECT * FROM budgets WHERE pool='visitors'")
    .first<{ reserved_micros: number; limit_micros: number }>();
  assert.equal(budget?.reserved_micros, 4000000);
  assert.equal(budget?.limit_micros, 4000000);
  for (const [i, r] of results.entries())
    if (r.status === 201) await cancel(r.data.id, "budget-" + i);
});

function pdfFixture(pages: number, words = "Hospital patient monitors") {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" +
      Array.from({ length: pages }, (_, i) => 4 + i * 2 + " 0 R").join(" ") +
      "] /Count " +
      pages +
      " >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let i = 0; i < pages; i++) {
    const stream = "BT /F1 12 Tf 50 750 Td (" + words + ") Tj ET";
    objects.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents " +
        (5 + i * 2) +
        " 0 R >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
    );
  }
  let data = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(data.length);
    data += i + 1 + " 0 obj\n" + object + "\nendobj\n";
  }
  const xref = data.length;
  data +=
    "xref\n0 " +
    (objects.length + 1) +
    "\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size " +
    (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return data;
}
test("text PDFs parse in the actual Worker runtime; 21 pages and image-only text fail", async () => {
  for (const [pages, words, status] of [
    [1, "Hospital patient monitors", 201],
    [20, "Laparoscopic trocars", 201],
    [21, "Hospital patient monitors", 400],
    [1, "", 400],
  ] as const) {
    const form = new FormData();
    form.set(
      "file",
      new File([pdfFixture(pages, words)], "catalog.pdf", {
        type: "application/pdf",
      }),
    );
    const r = await call("uploads", "pdf-owner", "POST", form);
    assert.equal(r.status, status, await r.text());
  }
});
test("official cache imports reject deceptive domains and keep dataset dates", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File(["Nombre,Actividad\nHospital example,Hospital"], "official.csv"),
  );
  form.set("kind", "denue");
  form.set("datasetDate", "2026-05-01");
  form.set("sourceUrl", "https://notinegi.org.mx/data");
  assert.equal(
    (await call("admin/datasets", "owner-test", "POST", form)).status,
    400,
  );
  form.set("sourceUrl", "https://www.inegi.org.mx/app/descarga/");
  const result = await call("admin/datasets", "owner-test", "POST", form);
  assert.equal(result.status, 201);
  const row = await db
    .prepare("SELECT dataset_date,row_count FROM datasets")
    .first<{ dataset_date: string; row_count: number }>();
  assert.equal(row?.dataset_date, "2026-05-01");
  assert.equal(row?.row_count, 1);
});

test("deletion cannot race a finishing stage and discard an unsettled charge", async () => {
  const { data, status } = await start("owner-test");
  assert.equal(status, 201);
  await db
    .prepare(
      "UPDATE runs SET status='complete',cost_micros=12000,lease_until=? WHERE id=?",
    )
    .bind(Date.now() + 60000, data.id)
    .run();
  assert.equal(
    (await call("runs/" + data.id, "owner-test", "DELETE")).status,
    409,
  );
  await ready(data.id);
  assert.equal(
    (await call("runs/" + data.id, "owner-test", "DELETE")).status,
    200,
  );
  const b = await db
    .prepare("SELECT reserved_micros FROM budgets WHERE pool='owner'")
    .first<{ reserved_micros: number }>();
  assert.equal(b?.reserved_micros, 0);
});

test("reviewed example CSV is available while signed out with mode-specific fields", async () => {
  const physician = await call(
    "examples/procedures/export?route=physicians",
    "",
  );
  assert.equal(physician.status, 200);
  assert.match(await physician.text(), /Spanish outreach draft/);
  const tender = await call("examples/monitoring/export?route=tenders", "");
  assert.equal(tender.status, 200);
  assert.match(await tender.text(), /Submission deadline/);
});
