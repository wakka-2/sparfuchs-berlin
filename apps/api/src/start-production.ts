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

process.stdout.write("[startup] process handlers registered\n");

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.stdout.write("[startup] node built-ins imported\n");

import postgres from "postgres";

process.stdout.write("[startup] postgres imported — entering main()\n");

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

async function runMigrations(sql: ReturnType<typeof postgres>) {
  process.stdout.write("[startup] Running database migrations...\n");

  // __dirname = apps/api/dist — go up one level to reach the source tree.
  // SQL files live in src/db/migrations/ which is always present in the repo,
  // so we never need to copy them into dist/.
  const migrationsDir = join(__dirname, "..", "src", "db", "migrations");
  const files = ["0000_init.sql", "0001_product_match_image.sql", "0002_is_estimated.sql"];
  for (const file of files) {
    const migrationPath = join(migrationsDir, file);
    const migration = readFileSync(migrationPath, "utf-8");
    await sql.unsafe(migration);
    process.stdout.write(`[startup] Applied migration: ${file}\n`);
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
  process.stdout.write(`[startup] DATABASE_URL prefix: ${DATABASE_URL.slice(0, 30)}...\n`);

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
