-- Migration 0004: prices expire with the offer they came from
--
-- Prices are this week's flyer offers. Until now a price row stayed on the
-- site forever, so an April offer still showed as "current" in November.
-- valid_until is the offer's last day; the API only returns rows where it is
-- today or later.
--
-- Every existing price, history row and image came from the old fuzzy name
-- matcher ("Spaghetti" → spaghetti-strap tops, "Zucker" → strawberry jam), so
-- they are removed rather than kept as misleading history. The next pipeline
-- run repopulates from the explicit catalog rules.
--
-- Lidl is deactivated: it publishes no grocery prices online, and an active
-- store with zero prices made the basket rank it "cheapest" at 0,00 €.

ALTER TABLE prices ADD COLUMN IF NOT EXISTS valid_until date;
CREATE INDEX IF NOT EXISTS idx_prices_valid_until ON prices (valid_until);

DELETE FROM price_history;
DELETE FROM prices;

UPDATE product_matches
   SET image_url = NULL, external_name = NULL, external_url = NULL, external_product_id = NULL;
UPDATE products SET image_url = NULL;

UPDATE stores SET is_active = false WHERE slug = 'lidl';
