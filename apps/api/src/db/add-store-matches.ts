import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs");

const products = await sql`SELECT id FROM products WHERE is_active = true`;
const stores = await sql`SELECT id, slug FROM stores WHERE is_active = true`;
console.log(`Adding matches: ${products.length} products × ${stores.length} stores`);

let added = 0;
for (const product of products) {
  for (const store of stores) {
    await sql`
      INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
      VALUES (${product.id}, ${store.id}, 1.00, false)
      ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING
    `;
    added++;
  }
}

const [{ count }] = await sql`SELECT count(*) FROM product_matches`;
console.log(`Done. Total matches: ${count}`);
await sql.end();
