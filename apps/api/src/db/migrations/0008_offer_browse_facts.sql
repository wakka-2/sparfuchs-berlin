-- Migration 0008: browse facts for the Angebote page
--
-- category: browse category (Aldi's own label, else derived from the name)
-- unit_price_cents / unit_kind: price per kg, L or piece, for sorting
-- match_key: the same branded product in the same size across stores, so a
--   card can say "auch bei Kaufland: 1,19 €". Exact matches only.
-- The table is rebuilt on every pipeline run, so no backfill is needed.

ALTER TABLE store_offers ADD COLUMN IF NOT EXISTS category varchar(30);
ALTER TABLE store_offers ADD COLUMN IF NOT EXISTS unit_price_cents integer;
ALTER TABLE store_offers ADD COLUMN IF NOT EXISTS unit_kind varchar(10);
ALTER TABLE store_offers ADD COLUMN IF NOT EXISTS match_key varchar(400);
CREATE INDEX IF NOT EXISTS idx_store_offers_category ON store_offers (category);
CREATE INDEX IF NOT EXISTS idx_store_offers_match_key ON store_offers (match_key);
