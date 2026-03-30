# Database Schema Design

## Berlin Supermarket Price Comparison Platform

---

## Overview

PostgreSQL 16 with Drizzle ORM. All prices stored as integers (cents) to avoid floating-point errors. Timestamps in UTC.

---

## Entity Relationship Diagram

```
stores (1) ──────────────── (N) product_matches
                                     │
products (1) ─────────────── (N) product_matches
     │                               │
     └── category_id (FK)    (1) ────┼──── (1) prices  [one current price per match]
                                     │
categories (1) ── (N) products (1) ──┴──── (N) price_history  [append-only changelog]

stores (1) ──── (N) pipeline_runs  [monitoring log]
```

---

## Tables

### stores

Supermarket chains supported by the platform.

```sql
CREATE TABLE stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,           -- "REWE"
    slug            VARCHAR(50) NOT NULL UNIQUE,      -- "rewe"
    logo_url        VARCHAR(500),
    website_url     VARCHAR(500),
    color_hex       VARCHAR(7),                       -- "#CC0000" (brand color)
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change (reusable trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data
INSERT INTO stores (name, slug, website_url, color_hex) VALUES
    ('REWE', 'rewe', 'https://www.rewe.de', '#CC0000'),
    ('Lidl', 'lidl', 'https://www.lidl.de', '#0050AA');
```

### categories

Product categories for browsing and filtering.

```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_de         VARCHAR(100) NOT NULL,            -- "Milchprodukte"
    name_en         VARCHAR(100) NOT NULL,            -- "Dairy"
    slug            VARCHAR(50) NOT NULL UNIQUE,       -- "dairy"
    icon            VARCHAR(10),                       -- emoji: "🥛"
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data
INSERT INTO categories (name_de, name_en, slug, icon, sort_order) VALUES
    ('Milchprodukte', 'Dairy', 'dairy', '🥛', 1),
    ('Brot & Backwaren', 'Bread & Bakery', 'bread', '🍞', 2),
    ('Fleisch & Wurst', 'Meat & Deli', 'meat', '🥩', 3),
    ('Obst', 'Fruits', 'fruits', '🍎', 4),
    ('Gemüse', 'Vegetables', 'vegetables', '🥬', 5),
    ('Getränke', 'Beverages', 'beverages', '🥤', 6),
    ('Vorratskammer', 'Pantry', 'pantry', '🫙', 7),
    ('Tiefkühl', 'Frozen', 'frozen', '🧊', 8),
    ('Eier', 'Eggs', 'eggs', '🥚', 9),
    ('Haushalt', 'Household', 'household', '🧹', 10);
```

### products

Canonical product definitions (store-agnostic).

```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_de         VARCHAR(200) NOT NULL,            -- "Vollmilch 3.5%"
    name_en         VARCHAR(200),                     -- "Whole Milk 3.5%"
    category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    image_url       VARCHAR(500),
    default_unit    VARCHAR(20) NOT NULL,              -- "L", "kg", "Stück", "Packung"
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
```

### product_matches

Maps canonical products to store-specific products. This is the core matching table.

```sql
CREATE TABLE product_matches (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    store_id              UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    external_product_id   VARCHAR(200),               -- Store's internal product ID
    external_name         VARCHAR(300),                -- "REWE Beste Wahl Frische Vollmilch 3,5%"
    ean                   VARCHAR(20),                 -- EAN/GTIN barcode
    external_url          VARCHAR(500),                -- Link to product page on store website
    match_confidence      DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    is_verified           BOOLEAN NOT NULL DEFAULT false,      -- Manual review flag
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
```

### prices

Current price per product-store match. Exactly **one row per product_match** — this is the live lookup table, not a history log.

```sql
CREATE TABLE prices (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_match_id      UUID NOT NULL REFERENCES product_matches(id) ON DELETE CASCADE,
    price_cents           INTEGER NOT NULL,             -- 119 = €1.19
    unit_size             VARCHAR(50) NOT NULL,          -- "1L", "500g", "10 Stück"
    unit_type             VARCHAR(20) NOT NULL,          -- "L", "kg", "Stück", "Packung"
    unit_price_cents      INTEGER NOT NULL,              -- Per-unit price in cents (per kg/L)
    currency              VARCHAR(3) NOT NULL DEFAULT 'EUR',
    fetched_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_price_positive CHECK (price_cents > 0),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price_cents > 0)
);

-- Exactly one price row per product_match (no is_current flag needed)
CREATE UNIQUE INDEX idx_prices_match ON prices(product_match_id);
CREATE INDEX idx_prices_fetched ON prices(fetched_at);

CREATE TRIGGER trg_prices_updated_at
    BEFORE UPDATE ON prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

> **Design note:** The previous design used an `is_current` boolean flag with multiple rows per product_match. This was simplified to exactly one row per match (upserted on each pipeline run). All historical tracking is handled exclusively by `price_history`, eliminating the dual-source-of-truth problem.

### price_history

Append-only log tracking every price change (written by pipeline when price differs from current).

```sql
CREATE TABLE price_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_match_id      UUID NOT NULL REFERENCES product_matches(id) ON DELETE CASCADE,
    price_cents           INTEGER NOT NULL,
    unit_price_cents      INTEGER NOT NULL,
    valid_from            TIMESTAMPTZ NOT NULL,
    valid_until           TIMESTAMPTZ,                  -- NULL = still current
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ph_match ON price_history(product_match_id);
CREATE INDEX idx_ph_dates ON price_history(product_match_id, valid_from, valid_until);
```

> **Pipeline update flow:**
> 1. Fetch new price from source
> 2. Compare with current `prices` row for this `product_match_id`
> 3. If different: close the current `price_history` row (`SET valid_until = now()`), insert new `price_history` row (`valid_from = now()`), then upsert `prices` row
> 4. If same: update only `fetched_at` on the `prices` row (no history entry)

### pipeline_runs

Tracks data ingestion pipeline execution for monitoring.

```sql
CREATE TABLE pipeline_runs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id              UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    status                VARCHAR(20) NOT NULL,         -- 'running', 'success', 'partial', 'failed'
    products_fetched      INTEGER NOT NULL DEFAULT 0,
    products_updated      INTEGER NOT NULL DEFAULT 0,
    products_failed       INTEGER NOT NULL DEFAULT 0,
    error_message         TEXT,
    started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at          TIMESTAMPTZ,
    duration_ms           INTEGER
);

CREATE INDEX idx_pipeline_store ON pipeline_runs(store_id, started_at DESC);
```

> **Note:** `ON DELETE RESTRICT` on `store_id` prevents accidental store deletion when pipeline history exists. To deactivate a store, set `is_active = false` instead of deleting.

---

## Key Queries

### Get all products with cheapest prices

```sql
SELECT
    p.id,
    p.name_de,
    p.name_en,
    c.slug AS category_slug,
    json_agg(
        json_build_object(
            'store', s.slug,
            'store_name', s.name,
            'price_cents', pr.price_cents,
            'unit_size', pr.unit_size,
            'unit_price_cents', pr.unit_price_cents,
            'fetched_at', pr.fetched_at
        ) ORDER BY pr.price_cents
    ) AS prices
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN product_matches pm ON pm.product_id = p.id AND pm.is_active = true
JOIN prices pr ON pr.product_match_id = pm.id
JOIN stores s ON s.id = pm.store_id AND s.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.name_de, p.name_en, c.slug
ORDER BY c.slug, p.name_de;
```

### Calculate basket total per store

```sql
-- Input: array of (product_id, quantity) pairs
WITH basket_items AS (
    SELECT unnest(ARRAY['uuid1','uuid2']::uuid[]) AS product_id,
           unnest(ARRAY[2, 1]::int[]) AS quantity
)
SELECT
    s.slug AS store,
    s.name AS store_name,
    SUM(pr.price_cents * bi.quantity) AS total_cents,
    COUNT(DISTINCT bi.product_id) AS items_available
FROM basket_items bi
JOIN product_matches pm ON pm.product_id = bi.product_id AND pm.is_active = true
JOIN prices pr ON pr.product_match_id = pm.id
JOIN stores s ON s.id = pm.store_id AND s.is_active = true
GROUP BY s.slug, s.name
ORDER BY total_cents;
```

### Full-text search (German + English)

```sql
-- Search German names (primary)
SELECT p.id, p.name_de, p.name_en,
       ts_rank(to_tsvector('german', p.name_de), plainto_tsquery('german', 'milch')) AS rank
FROM products p
WHERE p.is_active = true
  AND to_tsvector('german', p.name_de) @@ plainto_tsquery('german', 'milch')

UNION

-- Search English names (secondary, when name_en exists)
SELECT p.id, p.name_de, p.name_en,
       ts_rank(to_tsvector('english', p.name_en), plainto_tsquery('english', 'milk')) AS rank
FROM products p
WHERE p.is_active = true
  AND p.name_en IS NOT NULL
  AND to_tsvector('english', p.name_en) @@ plainto_tsquery('english', 'milk')

ORDER BY rank DESC
LIMIT 20;
```

---

## Migration Strategy

Using Drizzle Kit for migrations. Schema lives in `apps/api` (the service that owns the database), while the data pipeline imports from it:

```
apps/api/src/db/
├── schema.ts          # Drizzle schema definition (source of truth)
├── migrations/
│   ├── 0000_init.sql  # Initial schema + trigger function
│   ├── 0001_seed.sql  # Seed stores + categories
│   └── meta/          # Drizzle migration metadata
└── seed.ts            # Programmatic seed script for dev data

packages/data-pipeline/
└── src/
    └── db.ts          # Imports schema from @sparfuchs/api/db (via monorepo package reference)
```

---

## Index Summary

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| products | category_id | B-tree | Category filtering |
| products | name_de | GIN (tsvector, german) | Full-text search (German) |
| products | name_en | GIN (tsvector, english, partial) | Full-text search (English, where not null) |
| products | is_active | B-tree (partial) | Active product filtering |
| product_matches | product_id | B-tree | Join performance |
| product_matches | store_id | B-tree | Store filtering |
| product_matches | ean | B-tree (partial) | EAN-based matching |
| product_matches | store_id + external_product_id | B-tree composite | External ID lookups |
| prices | product_match_id | Unique | One price per match (no is_current flag) |
| prices | fetched_at | B-tree | Data freshness queries |
| price_history | product_match_id | B-tree | Match-based history lookup |
| price_history | match + dates | B-tree composite | Time-range queries |
| pipeline_runs | store + started_at | B-tree | Monitoring dashboard |
