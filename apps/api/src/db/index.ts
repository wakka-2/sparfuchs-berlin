import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

// Small pool + short idle timeout: each Vercel serverless invocation gets its
// own module instance, so a large default pool (10) multiplied across
// concurrent function instances can exhaust the database's connection limit.
const client = postgres(connectionString, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });

export type Database = typeof db;
