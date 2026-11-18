import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  text,
  numeric,
  date,
  real,
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
    isEstimated: boolean("is_estimated").notNull().default(false),
    /** Flyer offer (true) or the store's everyday shelf price (false) */
    isOffer: boolean("is_offer").notNull().default(true),
    /** Last day the offer is valid (Berlin calendar day). Null = expired legacy row. */
    validUntil: date("valid_until"),
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
// store_offers — everything a store currently sells online, for browsing
// (weekly offers from all stores + Aldi Nord's everyday range). Replaced per
// store on every pipeline run; not matched to catalog products.
// ============================================================
export const storeOffers = pgTable(
  "store_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 300 }).notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    unitText: varchar("unit_text", { length: 100 }).notNull(),
    baseText: varchar("base_text", { length: 100 }),
    imageUrl: varchar("image_url", { length: 500 }),
    url: varchar("url", { length: 500 }),
    isOffer: boolean("is_offer").notNull().default(true),
    validUntil: date("valid_until").notNull(),
    category: varchar("category", { length: 30 }),
    unitPriceCents: integer("unit_price_cents"),
    unitKind: varchar("unit_kind", { length: 10 }),
    matchKey: varchar("match_key", { length: 400 }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_offers_store").on(table.storeId),
    index("idx_store_offers_valid").on(table.validUntil),
    index("idx_store_offers_category").on(table.category),
    index("idx_store_offers_match_key").on(table.matchKey),
  ],
);

// ============================================================
// offer_reviews — the review queue (see migration 0006)
// ============================================================
export const offerReviews = pgTable(
  "offer_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "match|<name>|<productId>" or "price|<name>|<productId>|<cents>" */
    key: varchar("key", { length: 600 }).notNull().unique(),
    kind: varchar("kind", { length: 10 }).$type<"match" | "price">().notNull(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    offerName: varchar("offer_name", { length: 300 }).notNull(),
    unitText: varchar("unit_text", { length: 100 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    unitPriceCents: integer("unit_price_cents"),
    imageUrl: varchar("image_url", { length: 500 }),
    url: varchar("url", { length: 500 }),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 10 }).$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    /** human | ai-judge | auto-repeat */
    decidedBy: varchar("decided_by", { length: 20 }),
  },
  (table) => [index("idx_offer_reviews_status").on(table.status)],
);

/** One row per AI review run: agreement with the catalog rules and token usage. */
export const aiReviewRuns = pgTable("ai_review_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  model: varchar("model", { length: 50 }).notNull(),
  names: integer("names").notNull(),
  agree: integer("agree").notNull(),
  bothNone: integer("both_none").notNull(),
  aiOnly: integer("ai_only").notNull(),
  rulesOnly: integer("rules_only").notNull(),
  unsure: integer("unsure").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
});

/** The AI classifier's answer per offer name, so each name is asked once. */
export const offerClassifications = pgTable("offer_classifications", {
  nameKey: varchar("name_key", { length: 300 }).primaryKey(),
  /** Catalog product (products.name_de) or null = none of them */
  productName: varchar("product_name", { length: 200 }),
  confidence: real("confidence"),
  model: varchar("model", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
