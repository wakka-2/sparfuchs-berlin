-- Migration 0007: bread and rolls from the in-store bakery
--
-- The catalog only had packaged bread (Toastbrot, Vollkornbrot) and bake-off
-- rolls. Aldi Nord's range lists its in-store bakery with everyday prices
-- (Bäckerbrötchen, Krustenbrot) and Kaufland often has bakery offers, so they
-- become their own products. The production seed only runs on an empty
-- database, so new catalog entries are introduced here. Idempotent.

INSERT INTO products (name_de, name_en, category_id, default_unit)
SELECT v.de, v.en, c.id, v.unit
  FROM (VALUES ('Brot vom Bäcker', 'Bakery Bread', 'g'),
               ('Brötchen vom Bäcker', 'Bakery Rolls', 'Stück')) AS v(de, en, unit)
  JOIN categories c ON c.slug = 'bread'
 WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name_de = v.de);

INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
SELECT p.id, s.id, 1.00, false
  FROM products p
 CROSS JOIN stores s
 WHERE p.name_de IN ('Brot vom Bäcker', 'Brötchen vom Bäcker')
   AND s.is_active = true
ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING;
