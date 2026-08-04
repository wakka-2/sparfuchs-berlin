/**
 * Migration CLI.
 *
 * Run: pnpm --filter @sparfuchs/api db:migrate
 * The deploy workflow runs this against production before deploying.
 */
import postgres from "postgres";
import { runMigrations } from "./migrator.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

async function main() {
  const sql = postgres(connectionString, { max: 1 });
  console.log("[migrate] Running migrations...");
  try {
    await runMigrations(sql);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
