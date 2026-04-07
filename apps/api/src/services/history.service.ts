import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { products, productMatches, priceHistory, stores } from "../db/schema.js";
import { formatCents } from "../lib/response.js";

export interface PriceHistoryEntry {
  store_slug: string;
  store_name: string;
  store_color: string | null;
  price_cents: number;
  price_formatted: string;
  unit_price_cents: number;
  valid_from: string;
  valid_until: string | null;
}

export async function getProductPriceHistory(productId: string, limit = 50) {
  // Verify product exists
  const [product] = await db
    .select({ id: products.id, nameDe: products.nameDe })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1);

  if (!product) return null;

  const rows = await db
    .select({
      storeSlug: stores.slug,
      storeName: stores.name,
      storeColor: stores.colorHex,
      priceCents: priceHistory.priceCents,
      unitPriceCents: priceHistory.unitPriceCents,
      validFrom: priceHistory.validFrom,
      validUntil: priceHistory.validUntil,
    })
    .from(priceHistory)
    .innerJoin(productMatches, eq(productMatches.id, priceHistory.productMatchId))
    .innerJoin(stores, eq(stores.id, productMatches.storeId))
    .where(
      and(
        eq(productMatches.productId, productId),
        eq(productMatches.isActive, true),
        eq(stores.isActive, true),
      ),
    )
    .orderBy(desc(priceHistory.validFrom))
    .limit(limit);

  const history: PriceHistoryEntry[] = rows.map((r) => ({
    store_slug: r.storeSlug,
    store_name: r.storeName,
    store_color: r.storeColor,
    price_cents: r.priceCents,
    price_formatted: formatCents(r.priceCents),
    unit_price_cents: r.unitPriceCents,
    valid_from: r.validFrom.toISOString(),
    valid_until: r.validUntil?.toISOString() ?? null,
  }));

  return { product_id: productId, history };
}
