/**
 * Starts an embedded PostgreSQL instance for local development.
 * Run via: pnpm db:dev
 *
 * Downloads ~100MB of Postgres binaries on first run (cached after that).
 * Creates the `sparfuchs` database, runs migrations, and seeds demo data.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PORT = 5432;
const DB_USER = "postgres";
const DB_PASSWORD = "postgres";
const DB_NAME = "sparfuchs";

async function main() {
  console.log("[dev-db] Starting embedded PostgreSQL...");

  const pg = new EmbeddedPostgres({
    databaseDir: join(__dirname, "../../../../.pg-data"),
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
    // Force UTF-8 so emoji in seed data (category icons) don't fail on Windows
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  await pg.initialise();
  await pg.start();
  console.log(`[dev-db] PostgreSQL running on port ${DB_PORT}`);

  // Create database if it doesn't exist
  const adminSql = postgres(`postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/postgres`);
  try {
    const exists = await adminSql`
      SELECT 1 FROM pg_database WHERE datname = ${DB_NAME}
    `;
    if (exists.length === 0) {
      // Can't use parameterized queries for CREATE DATABASE
      await adminSql.unsafe(`CREATE DATABASE ${DB_NAME}`);
      console.log(`[dev-db] Database '${DB_NAME}' created.`);
    } else {
      console.log(`[dev-db] Database '${DB_NAME}' already exists.`);
    }
  } finally {
    await adminSql.end();
  }

  // Run migrations
  const sql = postgres(`postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}`);
  try {
    const migrationPath = join(__dirname, "migrations", "0000_init.sql");
    const migration = readFileSync(migrationPath, "utf-8");
    await sql.unsafe(migration);
    console.log("[dev-db] Migrations applied.");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("already exists")) {
      console.log("[dev-db] Schema already up to date.");
    } else {
      throw err;
    }
  } finally {
    await sql.end();
  }

  console.log("[dev-db] Ready. Press Ctrl+C to stop.");

  // Keep running until interrupted
  process.on("SIGINT", async () => {
    console.log("\n[dev-db] Stopping PostgreSQL...");
    await pg.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[dev-db] Fatal:", err);
  process.exit(1);
});
