-- Migration 0006: review queue for matches and prices
--
-- offer_reviews: things a person should look at before they affect the site.
--   kind 'price' — the pipeline held back a match because its unit price is
--     outside the product's plausible range or jumped more than 3x.
--     Approving it lets that exact offer and price through.
--   kind 'match' — the AI classifier disagrees with the catalog rules: it
--     thinks an offer is a product the rules miss, or doubts a rule match.
--     Approving / rejecting decides "offer name X is / is not product P".
--   key makes each question unique, so a decided item is never asked again.
--
-- offer_classifications: the AI's answer per offer name, so each name is
-- only sent to the model once.

CREATE TABLE IF NOT EXISTS offer_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key              varchar(600) NOT NULL UNIQUE,
  kind             varchar(10)  NOT NULL,
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id       uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  offer_name       varchar(300) NOT NULL,
  unit_text        varchar(100) NOT NULL,
  price_cents      integer NOT NULL,
  unit_price_cents integer,
  image_url        varchar(500),
  url              varchar(500),
  reason           text NOT NULL,
  status           varchar(10)  NOT NULL DEFAULT 'pending',
  created_at       timestamptz  NOT NULL DEFAULT now(),
  decided_at       timestamptz
);
CREATE INDEX IF NOT EXISTS idx_offer_reviews_status ON offer_reviews (status);

CREATE TABLE IF NOT EXISTS offer_classifications (
  name_key     varchar(300) PRIMARY KEY,
  product_name varchar(200),
  confidence   real,
  model        varchar(50) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
