import { eq, and, sql, count, asc, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  products,
  categories,
  productMatches,
  prices,
  stores,
} from "../db/schema.js";
import { formatCents, formatUnitPrice } from "../lib/response.js";

interface StorePrice {
  store_slug: string;
  store_name: string;
  store_color: string | null;
  price_cents: number;
  price_formatted: string;
  unit_size: string;
  unit_price_cents: number;
  unit_price_formatted: string;
  fetched_at: string;
  is_cheapest: boolean;
  external_name?: string | null;
  external_url?: string | null;
  ean?: string | null;
}

interface ProductWithPrices {
  id: string;
  name: string;
  name_de?: string;
  name_en?: string | null;
  category: { slug: string; name: string };
  image_url: string | null;
  default_unit: string;
  prices: StorePrice[];
  savings: {
    amount_cents: number;
    percentage: number;
    cheapest_store_slug: string;
    label: string;
  } | null;
}

function buildPriceList(
  rawPrices: Array<{
    storeSlug: string;
    storeName: string;
    storeColor: string | null;
    priceCents: number;
    unitSize: string;
    unitType: string;
    unitPriceCents: number;
    fetchedAt: Date;
    externalName?: string | null;
    externalUrl?: string | null;
    ean?: string | null;
  }>,
  includeExternal = false,
): { prices: StorePrice[]; savings: ProductWithPrices["savings"] } {
  if (rawPrices.length === 0) {
    return { prices: [], savings: null };
  }

  const sorted = [...rawPrices].sort((a, b) => a.priceCents - b.priceCents);
  const cheapest = sorted[0];

  const priceList: StorePrice[] = sorted.map((p) => {
    const entry: StorePrice = {
      store_slug: p.storeSlug,
      store_name: p.storeName,
      store_color: p.storeColor,
      price_cents: p.priceCents,
      price_formatted: formatCents(p.priceCents),
      unit_size: p.unitSize,
      unit_price_cents: p.unitPriceCents,
      unit_price_formatted: formatUnitPrice(p.unitPriceCents, p.unitType),
      fetched_at: p.fetchedAt.toISOString(),
      is_cheapest: p.storeSlug === cheapest.storeSlug,
    };
    if (includeExternal) {
      entry.external_name = p.externalName;
      entry.external_url = p.externalUrl;
      entry.ean = p.ean;
    }
    return entry;
  });

  let savings: ProductWithPrices["savings"] = null;
  if (sorted.length >= 2) {
    const most = sorted[sorted.length - 1];
    const diff = most.priceCents - cheapest.priceCents;
    const pct = most.priceCents > 0 ? (diff / most.priceCents) * 100 : 0;
    savings = {
      amount_cents: diff,
      percentage: Math.round(pct * 100) / 100,
      cheapest_store_slug: cheapest.storeSlug,
      label: `${formatCents(diff)} günstiger bei ${cheapest.storeName}`,
    };
  }

  return { prices: priceList, savings };
}

export interface ListProductsParams {
  category?: string;
  store?: string;
  sort?: string;
  page: number;
  limit: number;
  lang: string;
}

export async function listProducts(params: ListProductsParams) {
  const { category, page, limit, lang } = params;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [eq(products.isActive, true)];
  if (category) {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, category)).limit(1);
    if (cat) {
      conditions.push(eq(products.categoryId, cat.id));
    }
  }

  // Count total
  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(and(...conditions));

  // Fetch products
  const productRows = await db
    .select({
      id: products.id,
      nameDe: products.nameDe,
      nameEn: products.nameEn,
      imageUrl: products.imageUrl,
      defaultUnit: products.defaultUnit,
      catSlug: categories.slug,
      catNameDe: categories.nameDe,
      catNameEn: categories.nameEn,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(
      // Products with at least one price sort first (NULLS LAST = no price = end)
      sql`(
        SELECT MIN(p2.price_cents)
        FROM prices p2
        INNER JOIN product_matches pm2 ON pm2.id = p2.product_match_id
        WHERE pm2.product_id = ${products.id} AND pm2.is_active = true
      ) NULLS LAST`,
      asc(products.nameDe),
    )
    .limit(limit)
    .offset(offset);

  // Fetch all prices for these products in one query
  const productIds = productRows.map((p) => p.id);
  if (productIds.length === 0) {
    return { products: [], totalItems: total };
  }

  const priceRows = await db
    .select({
      productId: productMatches.productId,
      storeSlug: stores.slug,
      storeName: stores.name,
      storeColor: stores.colorHex,
      priceCents: prices.priceCents,
      unitSize: prices.unitSize,
      unitType: prices.unitType,
      unitPriceCents: prices.unitPriceCents,
      fetchedAt: prices.fetchedAt,
    })
    .from(prices)
    .innerJoin(productMatches, eq(productMatches.id, prices.productMatchId))
    .innerJoin(stores, eq(stores.id, productMatches.storeId))
    .where(
      and(
        sql`${productMatches.productId} IN ${productIds}`,
        eq(productMatches.isActive, true),
        eq(stores.isActive, true),
      ),
    );

  // Group prices by product
  const pricesByProduct = new Map<string, typeof priceRows>();
  for (const row of priceRows) {
    const existing = pricesByProduct.get(row.productId) ?? [];
    existing.push(row);
    pricesByProduct.set(row.productId, existing);
  }

  // Build response
  const result: ProductWithPrices[] = productRows.map((p) => {
    const rawPrices = pricesByProduct.get(p.id) ?? [];
    const { prices: priceList, savings } = buildPriceList(rawPrices);

    return {
      id: p.id,
      name: lang === "en" && p.nameEn ? p.nameEn : p.nameDe,
      category: {
        slug: p.catSlug,
        name: lang === "en" ? p.catNameEn : p.catNameDe,
      },
      image_url: p.imageUrl,
      default_unit: p.defaultUnit,
      prices: priceList,
      savings,
    };
  });

  return { products: result, totalItems: total };
}

export async function getProductById(id: string, lang: string) {
  const [product] = await db
    .select({
      id: products.id,
      nameDe: products.nameDe,
      nameEn: products.nameEn,
      imageUrl: products.imageUrl,
      defaultUnit: products.defaultUnit,
      catSlug: categories.slug,
      catNameDe: categories.nameDe,
      catNameEn: categories.nameEn,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.id, id), eq(products.isActive, true)))
    .limit(1);

  if (!product) return null;

  const priceRows = await db
    .select({
      productId: productMatches.productId,
      storeSlug: stores.slug,
      storeName: stores.name,
      storeColor: stores.colorHex,
      priceCents: prices.priceCents,
      unitSize: prices.unitSize,
      unitType: prices.unitType,
      unitPriceCents: prices.unitPriceCents,
      fetchedAt: prices.fetchedAt,
      externalName: productMatches.externalName,
      externalUrl: productMatches.externalUrl,
      ean: productMatches.ean,
    })
    .from(prices)
    .innerJoin(productMatches, eq(productMatches.id, prices.productMatchId))
    .innerJoin(stores, eq(stores.id, productMatches.storeId))
    .where(
      and(
        eq(productMatches.productId, id),
        eq(productMatches.isActive, true),
        eq(stores.isActive, true),
      ),
    );

  const { prices: priceList, savings } = buildPriceList(priceRows, true);

  return {
    id: product.id,
    name: lang === "en" && product.nameEn ? product.nameEn : product.nameDe,
    name_de: product.nameDe,
    name_en: product.nameEn,
    category: {
      slug: product.catSlug,
      name: lang === "en" ? product.catNameEn : product.catNameDe,
    },
    image_url: product.imageUrl,
    default_unit: product.defaultUnit,
    prices: priceList,
    savings,
  };
}

export async function searchProducts(query: string, limit: number, lang: string) {
  // Search German names first, then English
  const results = await db
    .select({
      id: products.id,
      nameDe: products.nameDe,
      nameEn: products.nameEn,
      catSlug: categories.slug,
      rank: sql<number>`ts_rank(to_tsvector('german', ${products.nameDe}), plainto_tsquery('german', ${query}))`,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.isActive, true),
        sql`to_tsvector('german', ${products.nameDe}) @@ plainto_tsquery('german', ${query})`,
      ),
    )
    .orderBy(desc(sql`ts_rank(to_tsvector('german', ${products.nameDe}), plainto_tsquery('german', ${query}))`))
    .limit(limit);

  // If no German results, try English
  if (results.length === 0) {
    const enResults = await db
      .select({
        id: products.id,
        nameDe: products.nameDe,
        nameEn: products.nameEn,
        catSlug: categories.slug,
        rank: sql<number>`ts_rank(to_tsvector('english', ${products.nameEn}), plainto_tsquery('english', ${query}))`,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.nameEn} IS NOT NULL`,
          sql`to_tsvector('english', ${products.nameEn}) @@ plainto_tsquery('english', ${query})`,
        ),
      )
      .orderBy(desc(sql`ts_rank(to_tsvector('english', ${products.nameEn}), plainto_tsquery('english', ${query}))`))
      .limit(limit);

    return formatSearchResults(enResults, lang);
  }

  return formatSearchResults(results, lang);
}

async function formatSearchResults(
  results: Array<{ id: string; nameDe: string; nameEn: string | null; catSlug: string; rank: number }>,
  lang: string,
) {
  if (results.length === 0) return [];

  // Get cheapest price per product
  const ids = results.map((r) => r.id);
  const priceRows = await db
    .select({
      productId: productMatches.productId,
      storeSlug: stores.slug,
      priceCents: prices.priceCents,
    })
    .from(prices)
    .innerJoin(productMatches, eq(productMatches.id, prices.productMatchId))
    .innerJoin(stores, eq(stores.id, productMatches.storeId))
    .where(sql`${productMatches.productId} IN ${ids}`);

  const cheapestByProduct = new Map<string, { cents: number; slug: string }>();
  for (const row of priceRows) {
    const existing = cheapestByProduct.get(row.productId);
    if (!existing || row.priceCents < existing.cents) {
      cheapestByProduct.set(row.productId, { cents: row.priceCents, slug: row.storeSlug });
    }
  }

  return results.map((r) => {
    const cheapest = cheapestByProduct.get(r.id);
    return {
      id: r.id,
      name: lang === "en" && r.nameEn ? r.nameEn : r.nameDe,
      category_slug: r.catSlug,
      cheapest_price_cents: cheapest?.cents ?? null,
      cheapest_store_slug: cheapest?.slug ?? null,
      relevance_score: Math.round(r.rank * 100) / 100,
    };
  });
}

export async function listCategories(lang: string) {
  const rows = await db
    .select({
      slug: categories.slug,
      nameDe: categories.nameDe,
      nameEn: categories.nameEn,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.isActive, true)))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));

  return rows.map((r) => ({
    slug: r.slug,
    name: lang === "en" ? r.nameEn : r.nameDe,
    icon: r.icon,
    product_count: r.productCount,
    sort_order: r.sortOrder,
  }));
}

export async function listStores() {
  const rows = await db
    .select({
      slug: stores.slug,
      name: stores.name,
      logoUrl: stores.logoUrl,
      websiteUrl: stores.websiteUrl,
      colorHex: stores.colorHex,
    })
    .from(stores)
    .where(eq(stores.isActive, true));

  // Get product count + last updated per store
  const result = [];
  for (const store of rows) {
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(productMatches)
      .innerJoin(stores, eq(stores.id, productMatches.storeId))
      .where(and(eq(stores.slug, store.slug), eq(productMatches.isActive, true)));

    const [lastPrice] = await db
      .select({ fetchedAt: prices.fetchedAt })
      .from(prices)
      .innerJoin(productMatches, eq(productMatches.id, prices.productMatchId))
      .innerJoin(stores, eq(stores.id, productMatches.storeId))
      .where(eq(stores.slug, store.slug))
      .orderBy(desc(prices.fetchedAt))
      .limit(1);

    result.push({
      slug: store.slug,
      name: store.name,
      logo_url: store.logoUrl,
      website_url: store.websiteUrl,
      color_hex: store.colorHex,
      product_count: cnt,
      last_updated: lastPrice?.fetchedAt?.toISOString() ?? null,
    });
  }

  return result;
}
