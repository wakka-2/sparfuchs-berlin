import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

async function migrate() {
  const sql = postgres(connectionString);

  console.log("[migrate] Running migrations...");

  const migrationPath = join(__dirname, "migrations", "0000_init.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  await sql.unsafe(migration);

  console.log("[migrate] Migration 0000_init.sql applied successfully.");
  console.log("[migrate] All migrations complete.");

  await sql.end();
}

migrate().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
