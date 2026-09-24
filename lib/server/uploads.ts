import { parse } from "csv-parse/sync";
import { extractText, getDocumentProxy } from "unpdf";
import { database, config, AppError } from "./env";
export const MAX_FILE = 10 * 1024 * 1024;
export async function catalogText(file: File) {
  if (!file.size || file.size > MAX_FILE)
    throw new AppError("Upload a non-empty file no larger than 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".pdf")) {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
      throw new AppError("This does not appear to be a PDF.");
    let doc;
    try {
      doc = await getDocumentProxy(bytes, { useSystemFonts: false });
      if (doc.numPages > 20)
        throw new AppError("PDFs may contain at most 20 pages.");
      const result = await extractText(doc, { mergePages: true });
      const text = result.text.trim();
      if (text.length < 10)
        throw new AppError(
          "No readable text was found. Use a text-based PDF, CSV, or paste your products.",
        );
      if (text.length > 20000)
        throw new AppError(
          "This catalog is too long for one run. Upload a smaller product selection (up to 20,000 characters).",
        );
      return text;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "The PDF could not be read. Use an unencrypted, text-based PDF, CSV, or paste your products.",
      );
    } finally {
      if (doc) await doc.loadingTask.destroy();
    }
  }
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw new AppError("Use a CSV or a text-based PDF.");
  try {
    const rows = parse(new TextDecoder().decode(bytes), {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      max_record_size: 20000,
    }) as string[][];
    if (rows.length > 501)
      throw new AppError("Use at most 500 catalog rows plus a header.");
    const text = rows
      .map((r) => r.join(" | "))
      .join("\n")
      .trim();
    if (text.length < 10 || text.length > 20000)
      throw new AppError(
        "Select between 10 and 20,000 characters of products.",
      );
    return text;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      "The CSV could not be read. Check quoting and row formatting, or paste your products.",
    );
  }
}
export async function saveUpload(file: File, owner: string) {
  const db = database(),
    bucket = config().BUCKET;
  if (!bucket)
    throw new AppError(
      "Uploads are temporarily unavailable; paste your catalog instead.",
      503,
    );
  const count = await db
    .prepare("SELECT COUNT(*) AS n FROM catalogs WHERE owner=?")
    .bind(owner)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 10)
    throw new AppError(
      "Delete an earlier upload before adding another (10 catalog limit).",
      429,
    );
  const content = await catalogText(file),
    id = crypto.randomUUID(),
    key = owner + "/" + id;
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "application/octet-stream" },
  });
  try {
    const inserted = await db
      .prepare(
        "INSERT INTO catalogs(id,owner,name,content,file_key,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM catalogs WHERE owner=?)<10",
      )
      .bind(
        id,
        owner,
        file.name.slice(0, 180),
        content,
        key,
        new Date().toISOString(),
        owner,
      )
      .run();
    if (!inserted.meta.changes)
      throw new AppError(
        "Delete an earlier upload before adding another (10 catalog limit).",
        429,
      );
  } catch (e) {
    await bucket.delete(key);
    throw e;
  }
  return { id, name: file.name, text: content };
}
export async function importDataset(
  file: File,
  kind: string,
  sourceUrl: string,
  date: string,
) {
  if (file.size > 2 * 1024 * 1024)
    throw new AppError(
      "Import a filtered CSV of at most 2 MB and 1,000 records.",
    );
  const url = new URL(sourceUrl);
  if (
    url.protocol !== "https:" ||
    !(kind === "denue"
      ? url.hostname === "inegi.org.mx" ||
        url.hostname.endsWith(".inegi.org.mx")
      : url.hostname.endsWith(".gob.mx"))
  )
    throw new AppError("Use an official INEGI or government source URL.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    date > new Date().toISOString().slice(0, 10)
  )
    throw new AppError("Provide the actual dataset date, not a future date.");
  let rows: Record<string, string>[];
  try {
    rows = parse(await file.text(), {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      max_record_size: 30000,
    });
  } catch {
    throw new AppError("Use a CSV with a header row.");
  }
  if (rows.some((row) => JSON.stringify(row).length > 24000))
    throw new AppError(
      "A dataset row is too long. Use a filtered selection of columns.",
    );
  if (!rows.length || rows.length > 1000)
    throw new AppError("Import 1–1,000 filtered records.");
  const db = database(),
    id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO datasets(id,kind,title,source_url,dataset_date,imported_at,row_count) VALUES(?,?,?,?,?,?,0)",
    )
    .bind(
      id,
      kind,
      file.name.slice(0, 180),
      url.href,
      date,
      new Date().toISOString(),
    )
    .run();
  try {
    for (let i = 0; i < rows.length; i += 40) {
      await db.batch(
        rows
          .slice(i, i + 40)
          .map((row) =>
            db
              .prepare(
                "INSERT INTO cached_records(id,dataset_id,kind,search_text,data_json) VALUES(?,?,?,?,?)",
              )
              .bind(
                crypto.randomUUID(),
                id,
                kind,
                Object.values(row).join(" ").slice(0, 4000).toLowerCase(),
                JSON.stringify(row),
              ),
          ),
      );
    }
    await db
      .prepare("UPDATE datasets SET row_count=? WHERE id=?")
      .bind(rows.length, id)
      .run();
    return { id, count: rows.length };
  } catch (e) {
    await db.batch([
      db.prepare("DELETE FROM cached_records WHERE dataset_id=?").bind(id),
      db.prepare("DELETE FROM datasets WHERE id=?").bind(id),
    ]);
    throw e;
  }
}
