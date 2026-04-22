import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  text,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// stores
// ============================================================
export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  logoUrl: varchar("logo_url", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  colorHex: varchar("color_hex", { length: 7 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storesRelations = relations(stores, ({ many }) => ({
  productMatches: many(productMatches),
  pipelineRuns: many(pipelineRuns),
}));

// ============================================================
// categories
// ============================================================
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameDe: varchar("name_de", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  icon: varchar("icon", { length: 10 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// ============================================================
// products
// ============================================================
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameDe: varchar("name_de", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    imageUrl: varchar("image_url", { length: 500 }),
    defaultUnit: varchar("default_unit", { length: 20 }).notNull(),
    descriptionDe: text("description_de"),
    descriptionEn: text("description_en"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_category").on(table.categoryId),
    index("idx_products_active").on(table.isActive).where(sql`is_active = true`),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  productMatches: many(productMatches),
}));

// ============================================================
// product_matches
// ============================================================
export const productMatches = pgTable(
  "product_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    externalProductId: varchar("external_product_id", { length: 200 }),
    externalName: varchar("external_name", { length: 300 }),
    ean: varchar("ean", { length: 20 }),
    externalUrl: varchar("external_url", { length: 500 }),
    imageUrl: varchar("image_url", { length: 500 }),
    matchConfidence: numeric("match_confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("1.00"),
    isVerified: boolean("is_verified").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_product_store").on(table.productId, table.storeId),
    index("idx_pm_product").on(table.productId),
    index("idx_pm_store").on(table.storeId),
    index("idx_pm_ean").on(table.ean).where(sql`ean IS NOT NULL`),
    index("idx_pm_external").on(table.storeId, table.externalProductId),
  ],
);

export const productMatchesRelations = relations(productMatches, ({ one, many }) => ({
  product: one(products, {
    fields: [productMatches.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [productMatches.storeId],
    references: [stores.id],
  }),
  price: one(prices),
  priceHistory: many(priceHistory),
}));

// ============================================================
// prices — one row per product_match (live lookup)
// ============================================================
export const prices = pgTable(
  "prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productMatchId: uuid("product_match_id")
      .notNull()
      .references(() => productMatches.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    unitSize: varchar("unit_size", { length: 50 }).notNull(),
    unitType: varchar("unit_type", { length: 20 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_prices_match").on(table.productMatchId),
    index("idx_prices_fetched").on(table.fetchedAt),
  ],
);

export const pricesRelations = relations(prices, ({ one }) => ({
  productMatch: one(productMatches, {
    fields: [prices.productMatchId],
    references: [productMatches.id],
  }),
}));

// ============================================================
// price_history — append-only changelog
// ============================================================
export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productMatchId: uuid("product_match_id")
      .notNull()
      .references(() => productMatches.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ph_match").on(table.productMatchId),
    index("idx_ph_dates").on(table.productMatchId, table.validFrom, table.validUntil),
  ],
);

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  productMatch: one(productMatches, {
    fields: [priceHistory.productMatchId],
    references: [productMatches.id],
  }),
}));

// ============================================================
// pipeline_runs — monitoring log
// ============================================================
export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull(),
    productsFetched: integer("products_fetched").notNull().default(0),
    productsUpdated: integer("products_updated").notNull().default(0),
    productsFailed: integer("products_failed").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
  },
  (table) => [index("idx_pipeline_store").on(table.storeId, table.startedAt)],
);

export const pipelineRunsRelations = relations(pipelineRuns, ({ one }) => ({
  store: one(stores, {
    fields: [pipelineRuns.storeId],
    references: [stores.id],
  }),
}));
