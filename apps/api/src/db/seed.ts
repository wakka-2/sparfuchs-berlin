/**
 * Development seed — catalog only.
 *
 * Inserts stores, categories, products, and product_matches.
 * Prices and image_url are intentionally left empty here;
 * they are populated by the data-pipeline when it runs against
 * the real REWE (Pepesto) and Lidl (Apify) APIs.
 *
 * Run: pnpm --filter @sparfuchs/api db:seed
 * Then: pnpm --filter @sparfuchs/data-pipeline run:once
 */
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/sparfuchs";

type ProductDef = { de: string; en: string; cat: string; unit: string };

const productDefs: ProductDef[] = [
  // Dairy (9)
  { de: "Vollmilch 3,5%",           en: "Whole Milk 3.5%",        cat: "dairy",      unit: "L"     },
  { de: "Fettarme Milch 1,5%",      en: "Low-fat Milk 1.5%",      cat: "dairy",      unit: "L"     },
  { de: "Butter",                    en: "Butter",                  cat: "dairy",      unit: "g"     },
  { de: "Gouda geschnitten",         en: "Gouda Sliced",            cat: "dairy",      unit: "g"     },
  { de: "Mozzarella",                en: "Mozzarella",              cat: "dairy",      unit: "g"     },
  { de: "Naturjoghurt",              en: "Plain Yogurt",            cat: "dairy",      unit: "g"     },
  { de: "Griechischer Joghurt",      en: "Greek Yogurt",            cat: "dairy",      unit: "g"     },
  { de: "Sahne",                     en: "Cream",                   cat: "dairy",      unit: "ml"    },
  { de: "Frischkäse",                en: "Cream Cheese",            cat: "dairy",      unit: "g"     },
  // Bread & Bakery (3)
  { de: "Toastbrot",                 en: "Toast Bread",             cat: "bread",      unit: "g"     },
  { de: "Vollkornbrot",              en: "Whole Grain Bread",       cat: "bread",      unit: "g"     },
  { de: "Brötchen (Aufback)",        en: "Bread Rolls (Bake-off)",  cat: "bread",      unit: "Stück" },
  { de: "Brot vom Bäcker",           en: "Bakery Bread",            cat: "bread",      unit: "g"     },
  { de: "Brötchen vom Bäcker",       en: "Bakery Rolls",            cat: "bread",      unit: "Stück" },
  // Meat & Deli (4)
  { de: "Hähnchenbrust",             en: "Chicken Breast",          cat: "meat",       unit: "g"     },
  { de: "Hackfleisch gemischt",      en: "Mixed Ground Meat",       cat: "meat",       unit: "g"     },
  { de: "Salami",                    en: "Salami",                  cat: "meat",       unit: "g"     },
  { de: "Kochschinken",              en: "Cooked Ham",              cat: "meat",       unit: "g"     },
  // Fruits (5)
  { de: "Bananen",                   en: "Bananas",                 cat: "fruits",     unit: "kg"    },
  { de: "Äpfel",                     en: "Apples",                  cat: "fruits",     unit: "kg"    },
  { de: "Trauben",                   en: "Grapes",                  cat: "fruits",     unit: "kg"    },
  { de: "Zitronen",                  en: "Lemons",                  cat: "fruits",     unit: "Stück" },
  { de: "Erdbeeren",                 en: "Strawberries",            cat: "fruits",     unit: "g"     },
  // Vegetables (7)
  { de: "Tomaten",                   en: "Tomatoes",                cat: "vegetables", unit: "kg"    },
  { de: "Gurke",                     en: "Cucumber",                cat: "vegetables", unit: "Stück" },
  { de: "Paprika",                   en: "Bell Pepper",             cat: "vegetables", unit: "Stück" },
  { de: "Kartoffeln",                en: "Potatoes",                cat: "vegetables", unit: "kg"    },
  { de: "Zwiebeln",                  en: "Onions",                  cat: "vegetables", unit: "kg"    },
  { de: "Karotten",                  en: "Carrots",                 cat: "vegetables", unit: "kg"    },
  { de: "Eisbergsalat",              en: "Iceberg Lettuce",         cat: "vegetables", unit: "Stück" },
  // Beverages (5)
  { de: "Mineralwasser 1,5L",        en: "Mineral Water 1.5L",      cat: "beverages",  unit: "L"     },
  { de: "Orangensaft",               en: "Orange Juice",            cat: "beverages",  unit: "L"     },
  { de: "Apfelsaft",                 en: "Apple Juice",             cat: "beverages",  unit: "L"     },
  { de: "Kaffee Filterkaffee",       en: "Filter Coffee",           cat: "beverages",  unit: "g"     },
  { de: "Schwarzer Tee",             en: "Black Tea",               cat: "beverages",  unit: "g"     },
  // Pantry (7)
  { de: "Spaghetti",                 en: "Spaghetti",               cat: "pantry",     unit: "g"     },
  { de: "Reis",                      en: "Rice",                    cat: "pantry",     unit: "g"     },
  { de: "Mehl",                      en: "Flour",                   cat: "pantry",     unit: "g"     },
  { de: "Zucker",                    en: "Sugar",                   cat: "pantry",     unit: "g"     },
  { de: "Sonnenblumenöl",            en: "Sunflower Oil",           cat: "pantry",     unit: "L"     },
  { de: "Passierte Tomaten",         en: "Strained Tomatoes",       cat: "pantry",     unit: "ml"    },
  { de: "Müsli",                     en: "Muesli",                  cat: "pantry",     unit: "g"     },
  // Frozen (4)
  { de: "TK-Pizza",                  en: "Frozen Pizza",            cat: "frozen",     unit: "g"     },
  { de: "TK-Erbsen",                 en: "Frozen Peas",             cat: "frozen",     unit: "g"     },
  { de: "Fischstäbchen",             en: "Fish Fingers",            cat: "frozen",     unit: "g"     },
  { de: "TK-Spinat",                 en: "Frozen Spinach",          cat: "frozen",     unit: "g"     },
  // Eggs (1)
  // Deliberately generic: flyers name eggs as compounds ("SONNENDORFER
  // Körndleier"), so husbandry/pack-size qualifiers make the product
  // unmatchable. See migration 0003_consolidate_eggs.sql.
  { de: "Eier",                      en: "Eggs",                    cat: "eggs",       unit: "Stück" },
  // Batch 2 (2026-11-18)
  { de: "Emmentaler", en: "Emmentaler", cat: "dairy", unit: "g" },
  { de: "Feta", en: "Feta", cat: "dairy", unit: "g" },
  { de: "Skyr", en: "Skyr", cat: "dairy", unit: "g" },
  { de: "Margarine", en: "Margarine", cat: "dairy", unit: "g" },
  { de: "Camembert / Brie", en: "Camembert / Brie", cat: "dairy", unit: "g" },
  { de: "Bratwurst", en: "Bratwurst", cat: "meat", unit: "g" },
  { de: "Wiener Würstchen", en: "Wiener Sausages", cat: "meat", unit: "g" },
  { de: "Putenbrust", en: "Turkey Breast", cat: "meat", unit: "g" },
  { de: "Räucherlachs", en: "Smoked Salmon", cat: "meat", unit: "g" },
  { de: "Clementinen / Mandarinen", en: "Clementines / Mandarins", cat: "fruits", unit: "g" },
  { de: "Orangen", en: "Oranges", cat: "fruits", unit: "g" },
  { de: "Birnen", en: "Pears", cat: "fruits", unit: "g" },
  { de: "Kiwi", en: "Kiwi", cat: "fruits", unit: "Stück" },
  { de: "Champignons", en: "Mushrooms", cat: "vegetables", unit: "g" },
  { de: "Nudeln (Penne / Fusilli)", en: "Short Pasta", cat: "pantry", unit: "g" },
  { de: "Mayonnaise", en: "Mayonnaise", cat: "pantry", unit: "ml" },
  { de: "Senf", en: "Mustard", cat: "pantry", unit: "ml" },
  { de: "Honig", en: "Honey", cat: "pantry", unit: "g" },
  { de: "Nuss-Nougat-Creme", en: "Hazelnut Spread", cat: "pantry", unit: "g" },
  { de: "Konfitüre", en: "Jam", cat: "pantry", unit: "g" },
  { de: "Cola", en: "Cola", cat: "beverages", unit: "ml" },
  { de: "Limonade", en: "Lemonade", cat: "beverages", unit: "ml" },
  { de: "Pils", en: "Pils", cat: "beverages", unit: "ml" },
  { de: "Kaffeekapseln", en: "Coffee Capsules", cat: "beverages", unit: "Stück" },
  { de: "Schokolade (Tafel)", en: "Chocolate Bar", cat: "sweets", unit: "g" },
  { de: "Gummibärchen / Fruchtgummi", en: "Gummy Sweets", cat: "sweets", unit: "g" },
  { de: "Chips", en: "Crisps", cat: "sweets", unit: "g" },
  { de: "Eiscreme", en: "Ice Cream", cat: "frozen", unit: "ml" },
  { de: "Zahnpasta", en: "Toothpaste", cat: "drugstore", unit: "ml" },
  { de: "Duschgel", en: "Shower Gel", cat: "drugstore", unit: "ml" },
  { de: "Shampoo", en: "Shampoo", cat: "drugstore", unit: "ml" },
  { de: "Weichspüler", en: "Fabric Softener", cat: "household", unit: "Stück" },
  { de: "Geschirrspültabs", en: "Dishwasher Tabs", cat: "household", unit: "Stück" },
  // Household (4)
  { de: "Spülmittel",                en: "Dish Soap",               cat: "household",  unit: "ml"    },
  { de: "Toilettenpapier",           en: "Toilet Paper",            cat: "household",  unit: "Stück" },
  { de: "Küchenrolle",               en: "Paper Towels",            cat: "household",  unit: "Stück" },
  { de: "Waschmittel",               en: "Laundry Detergent",       cat: "household",  unit: "L"     },
];

export async function seed() {
  const sql = postgres(connectionString);

  console.log("[seed] Seeding catalog (stores, categories, products, matches)...");

  // ── Stores ───────────────────────────────────────────────────────────────
  // No Lidl: it publishes no grocery prices online (see migration 0004).
  const storeRows = await sql`
    INSERT INTO stores (name, slug, website_url, color_hex) VALUES
      ('REWE',      'rewe',      'https://www.rewe.de',      '#CC0000'),
      ('Penny',     'penny',     'https://www.penny.de',     '#E30613'),
      ('Aldi Nord', 'aldi-nord', 'https://www.aldi-nord.de', '#00508F'),
      ('Kaufland',  'kaufland',  'https://www.kaufland.de',  '#E2001A')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;
  const storeIds: Record<string, string> = {};
  for (const row of storeRows) storeIds[row.slug] = row.id;
  console.log(`[seed] Stores: ${storeRows.map((r) => (r as { slug: string }).slug).join(', ')}`);

  // ── Categories ───────────────────────────────────────────────────────────
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
      ('Haushalt',         'Household',      'household',  '🧹', 10),
      ('Süßes & Snacks',   'Sweets & Snacks', 'sweets',     '🍫', 11),
      ('Drogerie',         'Drugstore',      'drugstore',  '🧴', 12)
    ON CONFLICT (slug) DO UPDATE SET name_de = EXCLUDED.name_de
    RETURNING id, slug
  `;
  const catMap: Record<string, string> = {};
  for (const row of categoryRows) catMap[row.slug] = row.id;
  console.log(`[seed] Categories: ${Object.keys(catMap).length} inserted`);

  // ── Products ─────────────────────────────────────────────────────────────
  // image_url intentionally omitted — the pipeline writes it from the real API
  const insertedIds: { id: string }[] = [];
  for (const p of productDefs) {
    const [existing] = await sql`SELECT id FROM products WHERE name_de = ${p.de} LIMIT 1`;
    const [row] = existing
      ? [existing]
      : await sql`
          INSERT INTO products (name_de, name_en, category_id, default_unit)
          VALUES (${p.de}, ${p.en}, ${catMap[p.cat]}, ${p.unit})
          RETURNING id
        `;
    if (row) insertedIds.push({ id: row.id });
  }
  console.log(`[seed] Products: ${insertedIds.length} inserted`);

  // ── Product matches ───────────────────────────────────────────────────────
  // external_product_id / ean / image_url left null — pipeline fills them in
  let matchCount = 0;
  for (const { id: productId } of insertedIds) {
    for (const storeId of Object.values(storeIds)) {
      await sql`
        INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
        VALUES (${productId}, ${storeId}, 1.00, false)
        ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING
      `;
      matchCount++;
    }
  }
  console.log(`[seed] Product matches: ${matchCount} created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const [{ stores: sc }]  = await sql`SELECT count(*)::int AS stores  FROM stores`;
  const [{ cats: cc }]    = await sql`SELECT count(*)::int AS cats    FROM categories`;
  const [{ prods: pc }]   = await sql`SELECT count(*)::int AS prods   FROM products`;
  const [{ matches: mc }] = await sql`SELECT count(*)::int AS matches FROM product_matches`;
  const [{ prices: prc }] = await sql`SELECT count(*)::int AS prices  FROM prices`;

  console.log("\n[seed] Catalog ready:");
  console.log(`  Stores:          ${sc}`);
  console.log(`  Categories:      ${cc}`);
  console.log(`  Products:        ${pc}`);
  console.log(`  Product matches: ${mc}`);
  console.log(`  Prices:          ${prc} (run the pipeline to populate)`);
  console.log("\n  Next step: pnpm --filter @sparfuchs/data-pipeline run:once");

  await sql.end();
}

import { fileURLToPath } from "node:url";

const isMain =
  typeof process.argv[1] === "string" &&
  process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  seed().catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
}
