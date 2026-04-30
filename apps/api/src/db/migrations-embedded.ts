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
];
