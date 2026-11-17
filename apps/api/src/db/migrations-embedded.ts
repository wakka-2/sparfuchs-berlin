/**
 * SQL migrations embedded as TypeScript strings.
 *
 * Generated from src/db/migrations/*.sql so that the production build
 * has zero file-system dependencies at startup — no file copying, no
 * path resolution, no ENOENT risk.
 *
 * Each migration must remain idempotent (CREATE TABLE IF NOT EXISTS,
 * ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION, etc.).
 */

export const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: "0000_init.sql",
    sql: `
-- ============================================================
-- Sparfuchs Berlin — Initial Schema Migration
-- ============================================================

-- Reusable trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- stores
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    logo_url        VARCHAR(500),
    website_url     VARCHAR(500),
    color_hex       VARCHAR(7),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_de         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    icon            VARCHAR(10),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_de         VARCHAR(200) NOT NULL,
    name_en         VARCHAR(200),
    category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    image_url       VARCHAR(500),
    default_unit    VARCHAR(20) NOT NULL,
    description_de  TEXT,
    description_en  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_de ON products USING gin(to_tsvector('german', name_de));
CREATE INDEX IF NOT EXISTS idx_products_name_en ON products USING gin(to_tsvector('english', name_en)) WHERE name_en IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- ============================================================
-- product_matches
-- ============================================================
CREATE TABLE IF NOT EXISTS product_matches (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    store_id              UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    external_product_id   VARCHAR(200),
    external_name         VARCHAR(300),
    ean                   VARCHAR(20),
    external_url          VARCHAR(500),
    image_url             VARCHAR(500),
    match_confidence      NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    is_verified           BOOLEAN NOT NULL DEFAULT false,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_product_store UNIQUE(product_id, store_id),
    CONSTRAINT chk_confidence_range CHECK (match_confidence >= 0 AND match_confidence <= 1)
);

CREATE OR REPLACE TRIGGER trg_product_matches_updated_at
    BEFORE UPDATE ON product_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pm_product ON product_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_pm_store ON product_matches(store_id);
CREATE INDEX IF NOT EXISTS idx_pm_ean ON product_matches(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_external ON product_matches(store_id, external_product_id);

-- ============================================================
-- prices (one row per product_match)
-- ============================================================
CREATE TABLE IF NOT EXISTS prices (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_match_id      UUID NOT NULL REFERENCES product_matches(id) ON DELETE CASCADE,
    price_cents           INTEGER NOT NULL,
    unit_size             VARCHAR(50) NOT NULL,
    unit_type             VARCHAR(20) NOT NULL,
    unit_price_cents      INTEGER NOT NULL,
    currency              VARCHAR(3) NOT NULL DEFAULT 'EUR',
    is_estimated          BOOLEAN NOT NULL DEFAULT false,
    fetched_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_price_positive CHECK (price_cents > 0),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price_cents > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prices_match ON prices(product_match_id);
CREATE INDEX IF NOT EXISTS idx_prices_fetched ON prices(fetched_at);

CREATE OR REPLACE TRIGGER trg_prices_updated_at
    BEFORE UPDATE ON prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- price_history (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_match_id      UUID NOT NULL REFERENCES product_matches(id) ON DELETE CASCADE,
    price_cents           INTEGER NOT NULL,
    unit_price_cents      INTEGER NOT NULL,
    valid_from            TIMESTAMPTZ NOT NULL,
    valid_until           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_match ON price_history(product_match_id);
CREATE INDEX IF NOT EXISTS idx_ph_dates ON price_history(product_match_id, valid_from, valid_until);

-- ============================================================
-- pipeline_runs (monitoring)
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id              UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    status                VARCHAR(20) NOT NULL,
    products_fetched      INTEGER NOT NULL DEFAULT 0,
    products_updated      INTEGER NOT NULL DEFAULT 0,
    products_failed       INTEGER NOT NULL DEFAULT 0,
    error_message         TEXT,
    started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at          TIMESTAMPTZ,
    duration_ms           INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pipeline_store ON pipeline_runs(store_id, started_at DESC);
`,
  },
  {
    name: "0001_product_match_image.sql",
    sql: `
-- Add per-store image URL to product_matches
ALTER TABLE product_matches
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
`,
  },
  {
    name: "0002_is_estimated.sql",
    sql: `
-- Migration 0002: add is_estimated flag to prices
ALTER TABLE prices
  ADD COLUMN IF NOT EXISTS is_estimated boolean NOT NULL DEFAULT false;
`,
  },
  {
    name: "0003_consolidate_eggs.sql",
    sql: `
-- Migration 0003: consolidate the two egg SKUs into a single "Eier" product.
-- The husbandry/pack-size qualifiers ("Freilandhaltung", "10er") never appear
-- in flyer names, dragging every egg match to 0.33 — below the 0.65 threshold.
-- A single generic "Eier" entry scores 1.00. Idempotent.

DELETE FROM product_matches
 WHERE product_id IN (
   SELECT id FROM products
    WHERE name_de IN ('Eier Freilandhaltung 10er', 'Eier Bodenhaltung 10er')
 );

DELETE FROM products
 WHERE name_de IN ('Eier Freilandhaltung 10er', 'Eier Bodenhaltung 10er');

INSERT INTO products (name_de, name_en, category_id, default_unit)
SELECT 'Eier', 'Eggs', c.id, 'Stück'
  FROM categories c
 WHERE c.slug = 'eggs'
   AND NOT EXISTS (SELECT 1 FROM products WHERE name_de = 'Eier');

INSERT INTO product_matches (product_id, store_id, match_confidence, is_verified)
SELECT p.id, s.id, 1.00, false
  FROM products p
 CROSS JOIN stores s
 WHERE p.name_de = 'Eier'
   AND s.is_active = true
ON CONFLICT ON CONSTRAINT uq_product_store DO NOTHING;
`,
  },
  {
    name: "0004_offer_validity.sql",
    sql: `
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
`,
  },
  {
    name: "0005_regular_prices_and_store_offers.sql",
    sql: `
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
`,
  },
  {
    name: "0006_offer_reviews.sql",
    sql: `
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
`,
  },
  {
    name: "0007_bakery_products.sql",
    sql: `
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
`,
  },
];
