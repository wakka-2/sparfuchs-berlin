import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@sparfuchs/api/db/schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { schema };

export async function closeDb() {
  await client.end();
}
