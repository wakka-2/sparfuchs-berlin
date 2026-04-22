/**
 * One-shot image repair script.
 *
 * Finds every product whose image_url is still null in both:
 *   1. products.image_url          (product-level fallback shown on all store cards)
 *   2. product_matches.image_url   (per-store thumbnail)
 *
 * For each such product it searches REWE then ALDI Nord, saves the first hit
 * to both products.image_url and the relevant product_match.image_url.
 *
 * Usage:
 *   pnpm --filter @sparfuchs/data-pipeline exec tsx src/repair-images.ts
 */
import { db, schema, closeDb } from "./db.js";
import { isNull, eq, and } from "drizzle-orm";
import { fetchStoreProductImage } from "./sources/store-image-search.js";
import { closeBrowser } from "./browser.js";

const SEARCH_STORES = ["rewe", "aldi-nord"] as const;

async function main() {
  // ── 1. Find products with no image anywhere ─────────────────────────────
  const products = await db
    .select({ id: schema.products.id, name: schema.products.nameDe })
    .from(schema.products)
    .where(isNull(schema.products.imageUrl));

  console.log(`[repair-images] ${products.length} products missing product-level image`);

  let filled = 0;
  let failed = 0;

  for (const product of products) {
    console.log(`[repair-images] searching for "${product.name}"…`);

    let foundUrl: string | null = null;
    let foundStore: string | null = null;

    for (const storeSlug of SEARCH_STORES) {
      foundUrl = await fetchStoreProductImage(storeSlug, product.name);
      if (foundUrl) {
        foundStore = storeSlug;
        break;
      }
    }

    if (!foundUrl) {
      console.warn(`[repair-images] no image found for "${product.name}"`);
      failed++;
      continue;
    }

    console.log(`[repair-images] ✓ "${product.name}" → ${foundUrl.slice(0, 80)}… (${foundStore})`);

    // Save to products.image_url
    await db
      .update(schema.products)
      .set({ imageUrl: foundUrl })
      .where(and(eq(schema.products.id, product.id), isNull(schema.products.imageUrl)));

    // Also save to the matching store's product_match.image_url
    if (foundStore) {
      const storeRow = await db.query.stores.findFirst({
        where: eq(schema.stores.slug, foundStore),
      });
      if (storeRow) {
        await db
          .update(schema.productMatches)
          .set({ imageUrl: foundUrl })
          .where(
            and(
              eq(schema.productMatches.productId, product.id),
              eq(schema.productMatches.storeId, storeRow.id),
              isNull(schema.productMatches.imageUrl),
            ),
          );
      }
    }

    filled++;
  }

  console.log(`\n[repair-images] Done — filled: ${filled}, not found: ${failed}`);
  await closeBrowser();
  await closeDb();
}

main().catch((err) => {
  console.error("[repair-images] Fatal:", err);
  process.exit(1);
});
