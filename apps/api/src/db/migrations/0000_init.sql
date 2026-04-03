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
CREATE TABLE stores (
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

CREATE TRIGGER trg_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- categories
-- ============================================================
CREATE TABLE categories (
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
CREATE TABLE products (
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

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_de ON products USING gin(to_tsvector('german', name_de));
CREATE INDEX idx_products_name_en ON products USING gin(to_tsvector('english', name_en)) WHERE name_en IS NOT NULL;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;

-- ============================================================
-- product_matches
-- ============================================================
CREATE TABLE product_matches (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    store_id              UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    external_product_id   VARCHAR(200),
    external_name         VARCHAR(300),
    ean                   VARCHAR(20),
    external_url          VARCHAR(500),
    match_confidence      NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    is_verified           BOOLEAN NOT NULL DEFAULT false,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_product_store UNIQUE(product_id, store_id),
    CONSTRAINT chk_confidence_range CHECK (match_confidence >= 0 AND match_confidence <= 1)
);

CREATE TRIGGER trg_product_matches_updated_at
    BEFORE UPDATE ON product_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_pm_product ON product_matches(product_id);
CREATE INDEX idx_pm_store ON product_matches(store_id);
CREATE INDEX idx_pm_ean ON product_matches(ean) WHERE ean IS NOT NULL;
CREATE INDEX idx_pm_external ON product_matches(store_id, external_product_id);

-- ============================================================
-- prices (one row per product_match)
-- ============================================================
CREATE TABLE prices (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_match_id      UUID NOT NULL REFERENCES product_matches(id) ON DELETE CASCADE,
    price_cents           INTEGER NOT NULL,
    unit_size             VARCHAR(50) NOT NULL,
    unit_type             VARCHAR(20) NOT NULL,
    unit_price_cents      INTEGER NOT NULL,
    currency              VARCHAR(3) NOT NULL DEFAULT 'EUR',
    fetched_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_price_positive CHECK (price_cents > 0),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price_cents > 0)
);

CREATE UNIQUE INDEX idx_prices_match ON prices(product_match_id);
CREATE INDEX idx_prices_fetched ON prices(fetched_at);

CREATE TRIGGER trg_prices_updated_at
    BEFORE UPDATE ON prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- price_history (append-only)
-- ============================================================
CREATE TABLE price_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_match_id      UUID NOT NULL REFERENCES product_matches(id) ON DELETE CASCADE,
    price_cents           INTEGER NOT NULL,
    unit_price_cents      INTEGER NOT NULL,
    valid_from            TIMESTAMPTZ NOT NULL,
    valid_until           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ph_match ON price_history(product_match_id);
CREATE INDEX idx_ph_dates ON price_history(product_match_id, valid_from, valid_until);

-- ============================================================
-- pipeline_runs (monitoring)
-- ============================================================
CREATE TABLE pipeline_runs (
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

CREATE INDEX idx_pipeline_store ON pipeline_runs(store_id, started_at DESC);
