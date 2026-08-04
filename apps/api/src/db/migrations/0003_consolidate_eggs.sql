-- Migration 0003: consolidate the two egg SKUs into a single "Eier" product
--
-- German supermarket flyers never name eggs "Eier Freilandhaltung 10er" — they
-- use compound brand names like "SONNENDORFER Körndleier". Scoring matches the
-- fraction of catalog words found in the offer name, so the husbandry and
-- pack-size qualifiers dragged every egg comparison to 0.33, below the 0.65
-- threshold: neither egg product could ever match an offer at any store.
-- A single generic "Eier" entry scores 1.00. The free-range/barn split was not
-- comparable across stores anyway, since no store labels eggs that way in a flyer.
--
-- Idempotent: safe to re-run.

-- product_matches.product_id is ON DELETE RESTRICT, so the matches must go
-- first. prices and price_history cascade from product_matches.
DELETE FROM product_matches
 WHERE product_id IN (
   SELECT id FROM products
    WHERE name_de IN ('Eier Freilandhaltung 10er', 'Eier Bodenhaltung 10er')
 );

DELETE FROM products
 WHERE name_de IN ('Eier Freilandhaltung 10er', 'Eier Bodenhaltung 10er');

-- Add the consolidated product. The production seed only runs on an empty
-- database, so new catalog entries have to be introduced by migration.
INSERT INTO products (name_de, name_en, category_id, default_unit)
SELECT 'Eier', 'Eggs', c.id, 'Stück'
  FROM categories c
 WHERE c.slug = 'eggs'
   AND NOT EXISTS (SELECT 1 FROM products WHERE name_de = 'Eier');

-- Match it against every active store so the pipeline picks it up.
INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
SELECT p.id, s.id, 1.00, false
  FROM products p
 CROSS JOIN stores s
 WHERE p.name_de = 'Eier'
   AND s.is_active = true
ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING;
