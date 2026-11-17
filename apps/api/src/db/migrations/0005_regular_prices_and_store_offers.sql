-- Migration 0005: everyday prices next to flyer offers, and a browsable list
-- of everything the stores publish.
--
-- prices.is_offer: Aldi Nord publishes its whole range with shelf prices, so a
-- product's price can now be the everyday price (false) rather than this
-- week's flyer offer (true). Existing rows are all flyer offers.
--
-- store_offers: every weekly offer from every store plus Aldi Nord's range,
-- replaced per store on each pipeline run, so people can browse all of them,
-- not only the products in our comparison catalog.

ALTER TABLE prices ADD COLUMN IF NOT EXISTS is_offer boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS store_offers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         varchar(300) NOT NULL,
  description  text,
  price_cents  integer NOT NULL,
  unit_text    varchar(100) NOT NULL,
  base_text    varchar(100),
  image_url    varchar(500),
  url          varchar(500),
  is_offer     boolean NOT NULL DEFAULT true,
  valid_until  date NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_offers_store ON store_offers (store_id);
CREATE INDEX IF NOT EXISTS idx_store_offers_valid ON store_offers (valid_until);
