import {
  integer,
  sqliteTable,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const catalogs = sqliteTable(
  "catalogs",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    fileKey: text("file_key"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_catalogs_owner").on(t.owner)],
);
export const budgets = sqliteTable("budgets", {
  pool: text("pool").primaryKey(),
  limitMicros: integer("limit_micros").notNull(),
  spentMicros: integer("spent_micros").notNull().default(0),
  reservedMicros: integer("reserved_micros").notNull().default(0),
});
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    pool: text("pool").notNull(),
    status: text("status").notNull(),
    stage: text("stage").notNull(),
    inputJson: text("input_json").notNull(),
    resultsJson: text("results_json").notNull().default("[]"),
    limitationsJson: text("limitations_json").notNull().default("[]"),
    responseId: text("response_id"),
    rawText: text("raw_text"),
    sourceUrlsJson: text("source_urls_json").notNull().default("[]"),
    costMicros: integer("cost_micros").notNull().default(0),
    reservationMicros: integer("reservation_micros").notNull(),
    settled: integer("settled").notNull().default(0),
    providerPolls: integer("provider_polls").notNull().default(0),
    leaseUntil: integer("lease_until").notNull().default(0),
    leaseToken: text("lease_token"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    error: text("error"),
  },
  (t) => [
    index("idx_runs_owner_created").on(t.owner, t.createdAt),
    index("idx_runs_status").on(t.status),
  ],
);
export const dailyClaims = sqliteTable(
  "daily_claims",
  {
    owner: text("owner").notNull(),
    day: text("day").notNull(),
    runId: text("run_id").notNull(),
  },
  (t) => [uniqueIndex("idx_daily_claims_owner_day").on(t.owner, t.day)],
);
export const datasets = sqliteTable(
  "datasets",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    datasetDate: text("dataset_date").notNull(),
    importedAt: text("imported_at").notNull(),
    rowCount: integer("row_count").notNull(),
  },
  (t) => [index("idx_datasets_kind").on(t.kind)],
);
export const cachedRecords = sqliteTable(
  "cached_records",
  {
    id: text("id").primaryKey(),
    datasetId: text("dataset_id").notNull(),
    kind: text("kind").notNull(),
    searchText: text("search_text").notNull(),
    dataJson: text("data_json").notNull(),
  },
  (t) => [
    index("idx_cached_records_dataset").on(t.datasetId),
    index("idx_cached_records_kind").on(t.kind),
  ],
);

export const providerRecords = sqliteTable(
  "provider_records",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    owner: text("owner").notNull(),
  },
  (t) => [index("idx_provider_records_run_owner").on(t.runId, t.owner)],
);
