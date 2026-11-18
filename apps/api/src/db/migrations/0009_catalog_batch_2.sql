-- Migration 0009: catalog batch 2 — 33 more products to compare
--
-- Chosen from the week's real offers: each is sold by at least two of the
-- four stores and compares like for like (per kg, litre or piece). Matching
-- rules live in packages/data-pipeline/src/catalog.ts. Two new categories
-- (Süßes & Snacks, Drogerie) hold the sweets and personal-care products.
-- The production seed only runs on an empty database, so this migration adds
-- them to existing ones. Idempotent.

INSERT INTO categories (name_de, name_en, slug, icon, sort_order) VALUES
  ('Süßes & Snacks', 'Sweets & Snacks', 'sweets',    '🍫', 11),
  ('Drogerie',       'Drugstore',       'drugstore', '🧴', 12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name_de, name_en, category_id, default_unit)
SELECT v.de, v.en, c.id, v.unit
  FROM (VALUES
        ('Emmentaler', 'Emmentaler', 'dairy', 'g'),
        ('Feta', 'Feta', 'dairy', 'g'),
        ('Skyr', 'Skyr', 'dairy', 'g'),
        ('Margarine', 'Margarine', 'dairy', 'g'),
        ('Camembert / Brie', 'Camembert / Brie', 'dairy', 'g'),
        ('Bratwurst', 'Bratwurst', 'meat', 'g'),
        ('Wiener Würstchen', 'Wiener Sausages', 'meat', 'g'),
        ('Putenbrust', 'Turkey Breast', 'meat', 'g'),
        ('Räucherlachs', 'Smoked Salmon', 'meat', 'g'),
        ('Clementinen / Mandarinen', 'Clementines / Mandarins', 'fruits', 'g'),
        ('Orangen', 'Oranges', 'fruits', 'g'),
        ('Birnen', 'Pears', 'fruits', 'g'),
        ('Kiwi', 'Kiwi', 'fruits', 'Stück'),
        ('Champignons', 'Mushrooms', 'vegetables', 'g'),
        ('Nudeln (Penne / Fusilli)', 'Short Pasta', 'pantry', 'g'),
        ('Mayonnaise', 'Mayonnaise', 'pantry', 'ml'),
        ('Senf', 'Mustard', 'pantry', 'ml'),
        ('Honig', 'Honey', 'pantry', 'g'),
        ('Nuss-Nougat-Creme', 'Hazelnut Spread', 'pantry', 'g'),
        ('Konfitüre', 'Jam', 'pantry', 'g'),
        ('Cola', 'Cola', 'beverages', 'ml'),
        ('Limonade', 'Lemonade', 'beverages', 'ml'),
        ('Pils', 'Pils', 'beverages', 'ml'),
        ('Kaffeekapseln', 'Coffee Capsules', 'beverages', 'Stück'),
        ('Schokolade (Tafel)', 'Chocolate Bar', 'sweets', 'g'),
        ('Gummibärchen / Fruchtgummi', 'Gummy Sweets', 'sweets', 'g'),
        ('Chips', 'Crisps', 'sweets', 'g'),
        ('Eiscreme', 'Ice Cream', 'frozen', 'ml'),
        ('Zahnpasta', 'Toothpaste', 'drugstore', 'ml'),
        ('Duschgel', 'Shower Gel', 'drugstore', 'ml'),
        ('Shampoo', 'Shampoo', 'drugstore', 'ml'),
        ('Weichspüler', 'Fabric Softener', 'household', 'Stück'),
        ('Geschirrspültabs', 'Dishwasher Tabs', 'household', 'Stück')
  ) AS v(de, en, cat, unit)
  JOIN categories c ON c.slug = v.cat
 WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name_de = v.de);

INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
SELECT p.id, s.id, 1.00, false
  FROM products p
 CROSS JOIN stores s
 WHERE p.name_de IN ('Emmentaler', 'Feta', 'Skyr', 'Margarine', 'Camembert / Brie', 'Bratwurst', 'Wiener Würstchen', 'Putenbrust', 'Räucherlachs', 'Clementinen / Mandarinen', 'Orangen', 'Birnen', 'Kiwi', 'Champignons', 'Nudeln (Penne / Fusilli)', 'Mayonnaise', 'Senf', 'Honig', 'Nuss-Nougat-Creme', 'Konfitüre', 'Cola', 'Limonade', 'Pils', 'Kaffeekapseln', 'Schokolade (Tafel)', 'Gummibärchen / Fruchtgummi', 'Chips', 'Eiscreme', 'Zahnpasta', 'Duschgel', 'Shampoo', 'Weichspüler', 'Geschirrspültabs')
   AND s.is_active = true
ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING;
