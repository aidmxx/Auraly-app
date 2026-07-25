import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

export function db() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:research-data/auraly.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initialiseDatabase() {
  await db().batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, login_id TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('participant','admin')),
        condition_code TEXT CHECK(condition_code IN ('A','B','C')),
        active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS studies (
        id TEXT PRIMARY KEY, participant_id TEXT UNIQUE NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'not_started', started_at TEXT, submitted_at TEXT,
        completion_seconds INTEGER, final_reflection TEXT DEFAULT '', final_word_count INTEGER DEFAULT 0,
        questionnaire_json TEXT DEFAULT '{}', feedback TEXT DEFAULT '', updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY, participant_id TEXT NOT NULL REFERENCES users(id),
        sequence_no INTEGER NOT NULL, prompt_inputs_json TEXT NOT NULL, full_prompt TEXT NOT NULL,
        ai_response TEXT NOT NULL, created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS scaffolds (
        id TEXT PRIMARY KEY, participant_id TEXT NOT NULL REFERENCES users(id),
        question TEXT NOT NULL, answer TEXT NOT NULL, created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY, participant_id TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL, word_count INTEGER NOT NULL, created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_interactions_participant ON interactions(participant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_drafts_participant ON drafts(participant_id)`,
    ],
    "write",
  );
}

export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const now = () => new Date().toISOString();
export const words = (value: string) => value.trim() ? value.trim().split(/\s+/).length : 0;
