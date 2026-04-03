import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { products, productMatches, prices, stores } from "../db/schema.js";
import { formatCents } from "../lib/response.js";

interface BasketItem {
  product_id: string;
  quantity: number;
}

export async function calculateBasket(items: BasketItem[]) {
  const productIds = items.map((i) => i.product_id);
  const quantityMap = new Map(items.map((i) => [i.product_id, i.quantity]));

  // Fetch all products with their prices across stores
  const rows = await db
    .select({
      productId: products.id,
      productName: products.nameDe,
      storeSlug: stores.slug,
      storeName: stores.name,
      priceCents: prices.priceCents,
    })
    .from(products)
    .innerJoin(productMatches, eq(productMatches.productId, products.id))
    .innerJoin(prices, eq(prices.productMatchId, productMatches.id))
    .innerJoin(stores, eq(stores.id, productMatches.storeId))
    .where(
      and(
        sql`${products.id} IN ${productIds}`,
        eq(products.isActive, true),
        eq(productMatches.isActive, true),
        eq(stores.isActive, true),
      ),
    );

  // Check which products were found
  const foundProductIds = new Set(rows.map((r) => r.productId));

  if (foundProductIds.size === 0) {
    return null; // All invalid
  }

  // Group by product, then by store
  const productPrices = new Map<
    string,
    { name: string; stores: Map<string, { slug: string; name: string; cents: number }> }
  >();

  for (const row of rows) {
    let product = productPrices.get(row.productId);
    if (!product) {
      product = { name: row.productName, stores: new Map() };
      productPrices.set(row.productId, product);
    }
    product.stores.set(row.storeSlug, {
      slug: row.storeSlug,
      name: row.storeName,
      cents: row.priceCents,
    });
  }

  // Get all active store slugs
  const allStores = await db
    .select({ slug: stores.slug, name: stores.name })
    .from(stores)
    .where(eq(stores.isActive, true));

  // Build per-item breakdown
  const itemsResult = [];
  for (const [productId, product] of productPrices) {
    const qty = quantityMap.get(productId) ?? 1;
    const pricesByStore: Record<string, { unit_cents: number; subtotal_cents: number }> = {};

    for (const [slug, storePrice] of product.stores) {
      pricesByStore[slug] = {
        unit_cents: storePrice.cents,
        subtotal_cents: storePrice.cents * qty,
      };
    }

    itemsResult.push({
      product_id: productId,
      name: product.name,
      quantity: qty,
      prices: pricesByStore,
    });
  }

  // Build per-store totals
  const totals: Record<
    string,
    {
      total_cents: number;
      total_formatted: string;
      items_available: number;
      items_missing: number;
      missing_products: string[];
    }
  > = {};

  for (const store of allStores) {
    let total = 0;
    let available = 0;
    const missing: string[] = [];

    for (const [productId, product] of productPrices) {
      const qty = quantityMap.get(productId) ?? 1;
      const storePrice = product.stores.get(store.slug);

      if (storePrice) {
        total += storePrice.cents * qty;
        available++;
      } else {
        missing.push(product.name);
      }
    }

    totals[store.slug] = {
      total_cents: total,
      total_formatted: formatCents(total),
      items_available: available,
      items_missing: missing.length,
      missing_products: missing,
    };
  }

  // Build recommendation
  const storeEntries = Object.entries(totals);
  const sortedByTotal = [...storeEntries].sort((a, b) => a[1].total_cents - b[1].total_cents);
  const cheapest = sortedByTotal[0];
  const mostExpensive = sortedByTotal[sortedByTotal.length - 1];

  // Find cheapest store with all items
  const completeStores = storeEntries.filter(([, t]) => t.items_missing === 0);
  const cheapestComplete = completeStores.length > 0
    ? completeStores.sort((a, b) => a[1].total_cents - b[1].total_cents)[0]
    : null;

  const maxSavings = mostExpensive[1].total_cents - cheapest[1].total_cents;
  const savingsPct =
    mostExpensive[1].total_cents > 0
      ? Math.round((maxSavings / mostExpensive[1].total_cents) * 1000) / 10
      : 0;

  let note = `${cheapest[0].charAt(0).toUpperCase() + cheapest[0].slice(1)} is cheapest.`;
  if (cheapest[1].items_missing > 0 && cheapestComplete) {
    note = `${cheapest[0].charAt(0).toUpperCase() + cheapest[0].slice(1)} is cheapest but missing ${cheapest[1].items_missing} item(s). ${cheapestComplete[0].charAt(0).toUpperCase() + cheapestComplete[0].slice(1)} has all items.`;
  }

  return {
    items: itemsResult,
    totals,
    recommendation: {
      cheapest_complete_store: cheapestComplete ? cheapestComplete[0] : null,
      cheapest_store: cheapest[0],
      max_savings_cents: maxSavings,
      max_savings_formatted: formatCents(maxSavings),
      savings_percentage: savingsPct,
      note,
    },
  };
}
