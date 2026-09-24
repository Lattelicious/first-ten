import { env } from "cloudflare:workers";
export type AppEnv = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  OPENAI_API_KEY?: string;
  DENUE_API_TOKEN?: string;
  OWNER_USER_ID?: string;
  PUBLIC_ORIGIN?: string;
  LIVE_RESEARCH_ENABLED?: string;
};
export function config() {
  return env as AppEnv;
}
export function database() {
  const db = config().DB;
  if (!db)
    throw new AppError("Saved research is temporarily unavailable.", 503);
  return db;
}
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function isOwner(userId: string) {
  return !!config().OWNER_USER_ID && config().OWNER_USER_ID === userId;
}
