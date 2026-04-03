import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

async function seed() {
  const sql = postgres(connectionString);

  console.log("[seed] Seeding database...");

  // ============================================================
  // Stores
  // ============================================================
  console.log("[seed] Inserting stores...");
  const [rewe, lidl] = await sql`
    INSERT INTO stores (name, slug, website_url, color_hex) VALUES
      ('REWE', 'rewe', 'https://www.rewe.de', '#CC0000'),
      ('Lidl', 'lidl', 'https://www.lidl.de', '#0050AA')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;

  const storeIds = { rewe: rewe.id, lidl: lidl.id };
  console.log(`[seed] Stores: REWE=${storeIds.rewe}, Lidl=${storeIds.lidl}`);

  // ============================================================
  // Categories
  // ============================================================
  console.log("[seed] Inserting categories...");
  const categoryRows = await sql`
    INSERT INTO categories (name_de, name_en, slug, icon, sort_order) VALUES
      ('Milchprodukte',    'Dairy',          'dairy',      '🥛', 1),
      ('Brot & Backwaren', 'Bread & Bakery', 'bread',      '🍞', 2),
      ('Fleisch & Wurst',  'Meat & Deli',    'meat',       '🥩', 3),
      ('Obst',             'Fruits',         'fruits',     '🍎', 4),
      ('Gemüse',           'Vegetables',     'vegetables', '🥬', 5),
      ('Getränke',         'Beverages',      'beverages',  '🥤', 6),
      ('Vorratskammer',    'Pantry',         'pantry',     '🫙', 7),
      ('Tiefkühl',         'Frozen',         'frozen',     '🧊', 8),
      ('Eier',             'Eggs',           'eggs',       '🥚', 9),
      ('Haushalt',         'Household',      'household',  '🧹', 10)
    ON CONFLICT (slug) DO UPDATE SET name_de = EXCLUDED.name_de
    RETURNING id, slug
  `;

  const catMap: Record<string, string> = {};
  for (const row of categoryRows) {
    catMap[row.slug] = row.id;
  }
  console.log(`[seed] Categories: ${Object.keys(catMap).length} inserted`);

  // ============================================================
  // Products — 50 MVP items
  // ============================================================
  console.log("[seed] Inserting 50 products...");

  type ProductDef = { de: string; en: string; cat: string; unit: string };

  const productDefs: ProductDef[] = [
    // Dairy (9)
    { de: "Vollmilch 3,5%",          en: "Whole Milk 3.5%",        cat: "dairy",      unit: "L" },
    { de: "Fettarme Milch 1,5%",     en: "Low-fat Milk 1.5%",      cat: "dairy",      unit: "L" },
    { de: "Butter",                   en: "Butter",                  cat: "dairy",      unit: "g" },
    { de: "Gouda geschnitten",        en: "Gouda Sliced",            cat: "dairy",      unit: "g" },
    { de: "Mozzarella",               en: "Mozzarella",              cat: "dairy",      unit: "g" },
    { de: "Naturjoghurt",             en: "Plain Yogurt",            cat: "dairy",      unit: "g" },
    { de: "Griechischer Joghurt",     en: "Greek Yogurt",            cat: "dairy",      unit: "g" },
    { de: "Sahne",                    en: "Cream",                   cat: "dairy",      unit: "ml" },
    { de: "Frischkäse",               en: "Cream Cheese",            cat: "dairy",      unit: "g" },
    // Bread & Bakery (3)
    { de: "Toastbrot",                en: "Toast Bread",             cat: "bread",      unit: "g" },
    { de: "Vollkornbrot",             en: "Whole Grain Bread",       cat: "bread",      unit: "g" },
    { de: "Brötchen (Aufback)",       en: "Bread Rolls (Bake-off)",  cat: "bread",      unit: "Stück" },
    // Meat & Deli (4)
    { de: "Hähnchenbrust",            en: "Chicken Breast",          cat: "meat",       unit: "g" },
    { de: "Hackfleisch gemischt",     en: "Mixed Ground Meat",       cat: "meat",       unit: "g" },
    { de: "Salami",                   en: "Salami",                  cat: "meat",       unit: "g" },
    { de: "Kochschinken",             en: "Cooked Ham",              cat: "meat",       unit: "g" },
    // Fruits (5)
    { de: "Bananen",                  en: "Bananas",                 cat: "fruits",     unit: "kg" },
    { de: "Äpfel",                    en: "Apples",                  cat: "fruits",     unit: "kg" },
    { de: "Trauben",                  en: "Grapes",                  cat: "fruits",     unit: "kg" },
    { de: "Zitronen",                 en: "Lemons",                  cat: "fruits",     unit: "Stück" },
    { de: "Erdbeeren",                en: "Strawberries",            cat: "fruits",     unit: "g" },
    // Vegetables (7)
    { de: "Tomaten",                  en: "Tomatoes",                cat: "vegetables", unit: "kg" },
    { de: "Gurke",                    en: "Cucumber",                cat: "vegetables", unit: "Stück" },
    { de: "Paprika",                  en: "Bell Pepper",             cat: "vegetables", unit: "Stück" },
    { de: "Kartoffeln",               en: "Potatoes",                cat: "vegetables", unit: "kg" },
    { de: "Zwiebeln",                 en: "Onions",                  cat: "vegetables", unit: "kg" },
    { de: "Karotten",                 en: "Carrots",                 cat: "vegetables", unit: "kg" },
    { de: "Eisbergsalat",             en: "Iceberg Lettuce",         cat: "vegetables", unit: "Stück" },
    // Beverages (5)
    { de: "Mineralwasser 1,5L",       en: "Mineral Water 1.5L",      cat: "beverages",  unit: "L" },
    { de: "Orangensaft",              en: "Orange Juice",            cat: "beverages",  unit: "L" },
    { de: "Apfelsaft",                en: "Apple Juice",             cat: "beverages",  unit: "L" },
    { de: "Kaffee Filterkaffee",      en: "Filter Coffee",           cat: "beverages",  unit: "g" },
    { de: "Schwarzer Tee",            en: "Black Tea",               cat: "beverages",  unit: "g" },
    // Pantry (7)
    { de: "Spaghetti",                en: "Spaghetti",               cat: "pantry",     unit: "g" },
    { de: "Reis",                     en: "Rice",                    cat: "pantry",     unit: "g" },
    { de: "Mehl",                     en: "Flour",                   cat: "pantry",     unit: "g" },
    { de: "Zucker",                   en: "Sugar",                   cat: "pantry",     unit: "g" },
    { de: "Sonnenblumenöl",           en: "Sunflower Oil",           cat: "pantry",     unit: "L" },
    { de: "Passierte Tomaten",        en: "Strained Tomatoes",       cat: "pantry",     unit: "ml" },
    { de: "Müsli",                    en: "Muesli",                  cat: "pantry",     unit: "g" },
    // Frozen (4)
    { de: "TK-Pizza",                 en: "Frozen Pizza",            cat: "frozen",     unit: "g" },
    { de: "TK-Erbsen",                en: "Frozen Peas",             cat: "frozen",     unit: "g" },
    { de: "Fischstäbchen",            en: "Fish Fingers",            cat: "frozen",     unit: "g" },
    { de: "TK-Spinat",                en: "Frozen Spinach",          cat: "frozen",     unit: "g" },
    // Eggs (2)
    { de: "Eier Freilandhaltung 10er",en: "Free-range Eggs 10pk",   cat: "eggs",       unit: "Stück" },
    { de: "Eier Bodenhaltung 10er",   en: "Barn Eggs 10pk",         cat: "eggs",       unit: "Stück" },
    // Household (4)
    { de: "Spülmittel",               en: "Dish Soap",               cat: "household",  unit: "ml" },
    { de: "Toilettenpapier",           en: "Toilet Paper",            cat: "household",  unit: "Stück" },
    { de: "Küchenrolle",              en: "Paper Towels",            cat: "household",  unit: "Stück" },
    { de: "Waschmittel",              en: "Laundry Detergent",       cat: "household",  unit: "L" },
  ];

  console.log(`[seed] Product definitions: ${productDefs.length}`);

  const insertedProducts: { id: string; de: string; cat: string }[] = [];

  for (const p of productDefs) {
    const [row] = await sql`
      INSERT INTO products (name_de, name_en, category_id, default_unit)
      VALUES (${p.de}, ${p.en}, ${catMap[p.cat]}, ${p.unit})
      ON CONFLICT DO NOTHING
      RETURNING id, name_de
    `;
    if (row) {
      insertedProducts.push({ id: row.id, de: row.name_de, cat: p.cat });
    }
  }

  console.log(`[seed] Products inserted: ${insertedProducts.length}`);

  // ============================================================
  // Product Matches — link each product to both stores
  // ============================================================
  console.log("[seed] Creating product matches for REWE + Lidl...");

  let matchCount = 0;
  for (const product of insertedProducts) {
    for (const storeId of Object.values(storeIds)) {
      await sql`
        INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
        VALUES (${product.id}, ${storeId}, 1.00, false)
        ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING
      `;
      matchCount++;
    }
  }

  console.log(`[seed] Product matches created: ${matchCount}`);

  // ============================================================
  // Verification
  // ============================================================
  const [productCount] = await sql`SELECT count(*)::int AS count FROM products`;
  const [matchCountResult] = await sql`SELECT count(*)::int AS count FROM product_matches`;
  const [catCount] = await sql`SELECT count(*)::int AS count FROM categories`;
  const [storeCount] = await sql`SELECT count(*)::int AS count FROM stores`;

  console.log("[seed] Verification:");
  console.log(`  Stores:          ${storeCount.count}`);
  console.log(`  Categories:      ${catCount.count}`);
  console.log(`  Products:        ${productCount.count}`);
  console.log(`  Product matches: ${matchCountResult.count}`);

  // Test full-text search
  const searchResults = await sql`
    SELECT name_de, name_en FROM products
    WHERE to_tsvector('german', name_de) @@ plainto_tsquery('german', 'milch')
  `;
  console.log(`\n[seed] Full-text search for 'milch': ${searchResults.length} results`);
  for (const r of searchResults) {
    console.log(`  - ${r.name_de} (${r.name_en})`);
  }

  const searchEn = await sql`
    SELECT name_de, name_en FROM products
    WHERE name_en IS NOT NULL
      AND to_tsvector('english', name_en) @@ plainto_tsquery('english', 'milk')
  `;
  console.log(`[seed] Full-text search for 'milk' (EN): ${searchEn.length} results`);
  for (const r of searchEn) {
    console.log(`  - ${r.name_de} (${r.name_en})`);
  }

  console.log("\n[seed] Done!");
  await sql.end();
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
