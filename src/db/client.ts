// The single shared database boundary (TC-STACK-04). No other module constructs
// a `postgres` client or repositories — everything goes through here.
//
//   DATABASE_URL set   -> postgres-backed repositories (TC-STACK-03)
//   DATABASE_URL unset -> named in-memory repositories  (TC-DATA-01)
//
// Server-only. Never import this from a client component (TC-STACK-02).

import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres, { type Sql } from "postgres";
import type { Repositories } from "@/src/domain/ports";
import { createInMemoryRepositories } from "./memory";
import { createPostgresRepositories } from "./postgres";

let sql: Sql | null = null;
let repositories: Repositories | null = null;

/** True when a real Postgres connection is configured. */
export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** The shared `postgres` client, or null when running on the in-memory fallback. */
export function getSql(): Sql | null {
  if (!isPostgresConfigured()) return null;
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL as string, {
      // bigint as string by default avoids precision loss; mappers coerce.
    });
  }
  return sql;
}

/** The single shared repository set, memoized for the process. */
export function getRepositories(): Repositories {
  if (repositories) return repositories;
  const client = getSql();
  repositories = client
    ? createPostgresRepositories(client)
    : createInMemoryRepositories();
  return repositories;
}

/**
 * Applies the bootstrap schema. No-op on the in-memory fallback; runs the
 * idempotent `bootstrap.sql` (CREATE TABLE/INDEX IF NOT EXISTS) when Postgres is
 * configured. Invoke from a deliberate init path, not on import.
 */
export async function ensureSchema(): Promise<void> {
  const client = getSql();
  if (!client) return;
  const ddl = readFileSync(join(process.cwd(), "src/db/bootstrap.sql"), "utf8");
  await client.unsafe(ddl);
}
