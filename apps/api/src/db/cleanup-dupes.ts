import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs");

// Delete duplicate products (keep the older one which has prices/matches)
// Delete their associated matches first, then the product rows
const dupes = await sql`
  SELECT name_de, array_agg(id ORDER BY created_at ASC) AS ids
  FROM products
  GROUP BY name_de
  HAVING count(*) > 1
`;
console.log(`Found ${dupes.length} duplicate product names`);

for (const dupe of dupes) {
  const keepId = dupe.ids[0];
  const deleteIds = dupe.ids.slice(1);
  
  // Delete matches for the duplicate products
  await sql`DELETE FROM product_matches WHERE product_id = ANY(${deleteIds})`;
  // Delete the duplicate products
  await sql`DELETE FROM products WHERE id = ANY(${deleteIds})`;
  console.log(`Kept ${keepId} for "${dupe.name_de}", deleted ${deleteIds.length} dupe(s)`);
}

const [{ count }] = await sql`SELECT count(*) FROM products`;
const [{ matches }] = await sql`SELECT count(*) AS matches FROM product_matches`;
console.log(`After cleanup: ${count} products, ${matches} matches`);
await sql.end();
