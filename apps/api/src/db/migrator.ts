/**
 * Migration runner with an applied-migrations ledger.
 *
 * Previously migrations were replayed from the top on every run, which only
 * worked against an empty database: 0000_init.sql uses bare CREATE TABLE, so a
 * second run fails with 'relation "stores" already exists'. Every migration is
 * now recorded in schema_migrations and applied at most once, inside a
 * transaction, so a partial failure cannot leave a migration half-applied.
 *
 * MIGRATIONS is imported from migrations-embedded.ts rather than read from
 * disk, so this works identically in CI, locally, and in a bundled deploy.
 */
import type postgres from "postgres";
import { MIGRATIONS } from "./migrations-embedded.js";

type Sql = ReturnType<typeof postgres>;

/**
 * Migrations that predate the ledger.
 *
 * A database created by the old runner already has these applied but has no
 * schema_migrations table to say so. Recording them instead of re-running them
 * avoids replaying non-idempotent DDL against live data.
 */
const PRE_LEDGER_MIGRATIONS = [
  "0000_init.sql",
  "0001_product_match_image.sql",
  "0002_is_estimated.sql",
];

async function ensureLedger(sql: Sql, log: (msg: string) => void): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const [{ ledger_empty }] = await sql<{ ledger_empty: boolean }[]>`
    SELECT NOT EXISTS (SELECT 1 FROM schema_migrations) AS ledger_empty
  `;
  if (!ledger_empty) return;

  // An empty ledger on a database that already has tables means it was built
  // by the pre-ledger runner — baseline it rather than replaying the schema.
  const [{ already_provisioned }] = await sql<{ already_provisioned: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'stores'
    ) AS already_provisioned
  `;
  if (!already_provisioned) return;

  for (const name of PRE_LEDGER_MIGRATIONS) {
    await sql`INSERT INTO schema_migrations (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
  }
  log(`Baselined existing database — ${PRE_LEDGER_MIGRATIONS.length} migration(s) marked applied.`);
}

/**
 * Apply every migration not yet recorded in the ledger.
 * Returns the names of the migrations that were applied by this call.
 */
export async function runMigrations(
  sql: Sql,
  log: (msg: string) => void = (msg) => console.log(`[migrate] ${msg}`),
): Promise<string[]> {
  await ensureLedger(sql, log);

  const rows = await sql<{ name: string }[]>`SELECT name FROM schema_migrations`;
  const applied = new Set(rows.map((r) => r.name));

  const newlyApplied: string[] = [];
  for (const { name, sql: migrationSql } of MIGRATIONS) {
    if (applied.has(name)) continue;

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx.unsafe("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    });

    log(`Applied: ${name}`);
    newlyApplied.push(name);
  }

  log(
    newlyApplied.length === 0
      ? "Already up to date."
      : `Complete — ${newlyApplied.length} migration(s) applied.`,
  );
  return newlyApplied;
}
