/**
 * Production entrypoint.
 *
 * Runs database migration (idempotent), optionally seeds if the stores table
 * is empty, then starts the HTTP server.
 *
 * Usage (set as Railway start command):
 *   node dist/start-production.js
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

async function runMigrations(sql: ReturnType<typeof postgres>) {
  console.log("[startup] Running database migrations...");

  const migrationPath = join(__dirname, "db", "migrations", "0000_init.sql");
  const migration = readFileSync(migrationPath, "utf-8");
  await sql.unsafe(migration);

  console.log("[startup] Migrations applied.");
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
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    await runMigrations(sql);

    const shouldSeed = await needsSeed(sql);
    if (shouldSeed) {
      console.log("[startup] No stores found — running seed...");
      // Import and run the seed script dynamically
      const { seed } = await import("./db/seed.js");
      await seed();
      console.log("[startup] Seed complete.");
    } else {
      console.log("[startup] Database already seeded — skipping.");
    }
  } finally {
    await sql.end();
  }

  console.log("[startup] Starting API server...");
  // Dynamic import starts the server defined in index.ts
  await import("./index.js");
}

main().catch((err) => {
  console.error("[startup] Failed to start:", err);
  process.exit(1);
});
