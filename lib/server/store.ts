import { database, AppError, isOwner } from "./env";
import type { ResearchRun, RunInput } from "../types";
export type Row = {
  id: string;
  owner: string;
  pool: string;
  status: ResearchRun["status"];
  stage: string;
  input_json: string;
  results_json: string;
  limitations_json: string;
  response_id: string | null;
  raw_text: string | null;
  source_urls_json: string;
  cost_micros: number;
  reservation_micros: number;
  settled: number;
  provider_polls: number;
  lease_until: number;
  lease_token: string | null;
  created_at: string;
  updated_at: string;
  error: string | null;
};
export const RESERVATION = 2_000_000;
export function publicRun(row: Row): ResearchRun {
  return {
    id: row.id,
    status: row.status,
    stage: row.stage,
    input: JSON.parse(row.input_json),
    results: JSON.parse(row.results_json),
    limitations: JSON.parse(row.limitations_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    costUsd: row.cost_micros / 1e6,
    durationMs: ["complete", "failed", "cancelled"].includes(row.status)
      ? new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()
      : null,
    error: row.error,
  };
}
export async function ownedRun(id: string, owner: string) {
  const row = await database()
    .prepare("SELECT * FROM runs WHERE id=? AND owner=?")
    .bind(id, owner)
    .first<Row>();
  if (!row) throw new AppError("Research not found.", 404);
  return row;
}
export async function initializeBudgets() {
  await database().batch([
    database().prepare(
      "INSERT INTO budgets(pool,limit_micros) VALUES('visitors',20000000) ON CONFLICT(pool) DO NOTHING",
    ),
    database().prepare(
      "INSERT INTO budgets(pool,limit_micros) VALUES('owner',5000000) ON CONFLICT(pool) DO NOTHING",
    ),
  ]);
}
export async function createRun(owner: string, input: RunInput) {
  const db = database();
  await initializeBudgets();
  const ownerRun = isOwner(owner),
    pool = ownerRun ? "owner" : "visitors",
    id = crypto.randomUUID(),
    now = new Date().toISOString(),
    day = now.slice(0, 10);
  await db.batch([
    db
      .prepare(
        "INSERT INTO runs(id,owner,pool,status,stage,input_json,reservation_micros,created_at,updated_at) SELECT ?,?,?,'queued','Ready to research',?,?,?,? WHERE EXISTS(SELECT 1 FROM budgets WHERE pool=? AND spent_micros+reserved_micros+?<=limit_micros) AND NOT EXISTS(SELECT 1 FROM runs WHERE owner=? AND status IN ('queued','researching','verifying')) AND (?=1 OR NOT EXISTS(SELECT 1 FROM daily_claims WHERE owner=? AND day=?))",
      )
      .bind(
        id,
        owner,
        pool,
        JSON.stringify(input),
        RESERVATION,
        now,
        now,
        pool,
        RESERVATION,
        owner,
        ownerRun ? 1 : 0,
        owner,
        day,
      ),
    db
      .prepare(
        "UPDATE budgets SET reserved_micros=reserved_micros+? WHERE pool=? AND EXISTS(SELECT 1 FROM runs WHERE id=?)",
      )
      .bind(RESERVATION, pool, id),
    db
      .prepare(
        "INSERT INTO daily_claims(owner,day,run_id) SELECT ?,?,? WHERE ?=0 AND EXISTS(SELECT 1 FROM runs WHERE id=?)",
      )
      .bind(owner, day, id, ownerRun ? 1 : 0, id),
  ]);
  const row = await db
    .prepare("SELECT * FROM runs WHERE id=? AND owner=?")
    .bind(id, owner)
    .first<Row>();
  if (!row)
    throw new AppError(
      "Research cannot start: one run per day, one active run, or the shared demonstration allowance has been reached.",
      429,
    );
  return row;
}
export async function acquireLease(row: Row) {
  const token = crypto.randomUUID();
  const changed = await database()
    .prepare(
      "UPDATE runs SET lease_until=?,lease_token=? WHERE id=? AND lease_until<? AND (stage='Ready to research' OR updated_at<?) AND status IN ('queued','researching','verifying')",
    )
    .bind(
      Date.now() + 60000,
      token,
      row.id,
      Date.now(),
      new Date(Date.now() - 1500).toISOString(),
    )
    .run();
  return changed.meta.changes ? token : null;
}
export async function updateLeased(
  id: string,
  token: string,
  values: Partial<Row>,
) {
  const entries = Object.entries(values);
  if (!entries.length) return;
  const allowed = new Set([
    "status",
    "stage",
    "response_id",
    "raw_text",
    "source_urls_json",
    "cost_micros",
    "results_json",
    "limitations_json",
    "error",
    "provider_polls",
  ]);
  if (entries.some(([k]) => !allowed.has(k)))
    throw new Error("Invalid state update");
  await database()
    .prepare(
      "UPDATE runs SET " +
        entries.map(([k]) => k + "=?").join(",") +
        ",updated_at=? WHERE id=? AND lease_token=? AND status NOT IN ('cancelled','complete','failed')",
    )
    .bind(...entries.map(([, v]) => v), new Date().toISOString(), id, token)
    .run();
}
export async function releaseLease(id: string, token: string) {
  await database()
    .prepare(
      "UPDATE runs SET lease_until=0,lease_token=NULL WHERE id=? AND lease_token=?",
    )
    .bind(id, token)
    .run();
}
export async function settle(id: string, conservative = false) {
  const db = database();
  await db.batch([
    db
      .prepare(
        "UPDATE budgets SET spent_micros=spent_micros+(SELECT CASE WHEN ?=1 THEN max(cost_micros,reservation_micros) ELSE cost_micros END FROM runs WHERE id=?),reserved_micros=max(0,reserved_micros-(SELECT reservation_micros FROM runs WHERE id=?)) WHERE pool=(SELECT pool FROM runs WHERE id=?) AND EXISTS(SELECT 1 FROM runs WHERE id=? AND settled=0)",
      )
      .bind(conservative ? 1 : 0, id, id, id, id),
    db.prepare("UPDATE runs SET settled=1 WHERE id=? AND settled=0").bind(id),
  ]);
}
