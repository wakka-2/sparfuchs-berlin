/**
 * Production entrypoint.
 *
 * Runs database migration (idempotent), optionally seeds if the stores table
 * is empty, then starts the HTTP server.
 *
 * Start command (Render / Railway):
 *   node apps/api/dist/start-production.js    (run from repo root)
 */

// ── Catch anything that escapes the main() try/catch ─────────────────────────
process.on("uncaughtException", (err) => {
  process.stdout.write(`[startup] uncaughtException: ${err.stack ?? err}\n`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  process.stdout.write(`[startup] unhandledRejection: ${reason}\n`);
  process.exit(1);
});

import postgres from "postgres";
import { MIGRATIONS } from "./db/migrations-embedded.js";

process.stdout.write("[startup] modules loaded — entering main()\n");

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

async function runMigrations(sql: ReturnType<typeof postgres>) {
  process.stdout.write("[startup] Running database migrations...\n");
  for (const { name, sql: migrationSql } of MIGRATIONS) {
    await sql.unsafe(migrationSql);
    process.stdout.write(`[startup] Applied migration: ${name}\n`);
  }
  process.stdout.write("[startup] All migrations applied.\n");
}

async function needsSeed(sql: ReturnType<typeof postgres>): Promise<boolean> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM stores`;
    return Number(result[0].count) === 0;
  } catch {
    return false;
  }
}

async function main() {
  process.stdout.write(`[startup] Connecting to database...\n`);
  const sql = postgres(DATABASE_URL, { max: 1, ssl: "require" });

  try {
    await runMigrations(sql);

    const shouldSeed = await needsSeed(sql);
    if (shouldSeed) {
      process.stdout.write("[startup] No stores found — running seed...\n");
      const { seed } = await import("./db/seed.js");
      await seed();
      process.stdout.write("[startup] Seed complete.\n");
    } else {
      process.stdout.write("[startup] Database already seeded — skipping.\n");
    }
  } finally {
    await sql.end();
  }

  process.stdout.write("[startup] Starting API server...\n");
  await import("./index.js");
}

main().catch((err: unknown) => {
  process.stdout.write(`[startup] FATAL: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
