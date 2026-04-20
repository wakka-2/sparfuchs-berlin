import { eq, and, isNull } from "drizzle-orm";
import { db, schema, closeDb } from "./db.js";
import { normalizePrice } from "./normalizer/index.js";
import type { StoreSource, PipelineRunResult } from "./types.js";

/**
 * Run the pipeline for a single store:
 * 1. Load product matches from DB
 * 2. Fetch prices from source
 * 3. Normalize prices
 * 4. Upsert into prices table
 * 5. Update price_history on delta
 * 6. Log pipeline run
 */
export async function runPipelineForStore(source: StoreSource): Promise<PipelineRunResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let fetched = 0;
  let updated = 0;
  let failed = 0;

  console.log(`[pipeline] Starting ${source.storeSlug} pipeline...`);

  // 1. Get store ID
  const [store] = await db
    .select()
    .from(schema.stores)
    .where(eq(schema.stores.slug, source.storeSlug))
    .limit(1);

  if (!store) {
    throw new Error(`Store "${source.storeSlug}" not found in database`);
  }

  // 2. Log pipeline run as "running"
  const [run] = await db
    .insert(schema.pipelineRuns)
    .values({
      storeId: store.id,
      status: "running",
    })
    .returning();

  try {
    // 3. Load product matches for this store
    const matches = await db
      .select({
        matchId: schema.productMatches.id,
        productId: schema.productMatches.productId,
        externalProductId: schema.productMatches.externalProductId,
        productName: schema.products.nameDe,
        defaultUnit: schema.products.defaultUnit,
      })
      .from(schema.productMatches)
      .innerJoin(schema.products, eq(schema.products.id, schema.productMatches.productId))
      .where(
        and(
          eq(schema.productMatches.storeId, store.id),
          eq(schema.productMatches.isActive, true),
          eq(schema.products.isActive, true),
        ),
      );

    console.log(`[pipeline] ${source.storeSlug}: ${matches.length} product matches to process`);

    // 4. Fetch + normalize + upsert one by one
    for (const match of matches) {
      try {
        const raw = await source.fetchProduct(
          match.externalProductId ?? "",
          match.productName,
        );

        if (!raw) {
          console.warn(`[pipeline] ${source.storeSlug}: no data for "${match.productName}"`);
          failed++;
          continue;
        }

        fetched++;

        // Enrich product_match with external identifiers from the API response
        await db
          .update(schema.productMatches)
          .set({
            externalProductId: raw.externalId || undefined,
            externalName: raw.name || undefined,
            ean: raw.ean || undefined,
            externalUrl: raw.url || undefined,
            updatedAt: new Date(),
          })
          .where(eq(schema.productMatches.id, match.matchId));

        // Write image_url to the product — only if it's still null (don't overwrite manually curated URLs)
        if (raw.imageUrl) {
          await db
            .update(schema.products)
            .set({ imageUrl: raw.imageUrl })
            .where(and(eq(schema.products.id, match.productId), isNull(schema.products.imageUrl)));
        }

        // Normalize
        const normalized = normalizePrice(raw, match.matchId, match.defaultUnit);

        if (!normalized) {
          console.warn(`[pipeline] ${source.storeSlug}: normalization failed for "${match.productName}"`);
          failed++;
          continue;
        }

        // Check existing price
        const [existingPrice] = await db
          .select()
          .from(schema.prices)
          .where(eq(schema.prices.productMatchId, match.matchId))
          .limit(1);

        const now = new Date();

        if (existingPrice) {
          if (existingPrice.priceCents !== normalized.priceCents) {
            // Price changed — update history
            // Close current history record
            await db
              .update(schema.priceHistory)
              .set({ validUntil: now })
              .where(
                and(
                  eq(schema.priceHistory.productMatchId, match.matchId),
                  eq(schema.priceHistory.priceCents, existingPrice.priceCents),
                ),
              );

            // Open new history record
            await db.insert(schema.priceHistory).values({
              productMatchId: match.matchId,
              priceCents: normalized.priceCents,
              unitPriceCents: normalized.unitPriceCents,
              validFrom: now,
            });

            // Update current price
            await db
              .update(schema.prices)
              .set({
                priceCents: normalized.priceCents,
                unitSize: normalized.unitSize,
                unitType: normalized.unitType,
                unitPriceCents: normalized.unitPriceCents,
                fetchedAt: now,
              })
              .where(eq(schema.prices.id, existingPrice.id));

            console.log(
              `[pipeline] ${source.storeSlug}: "${match.productName}" price changed ${existingPrice.priceCents} → ${normalized.priceCents}`,
            );
          } else {
            // Same price — just update fetchedAt
            await db
              .update(schema.prices)
              .set({ fetchedAt: now })
              .where(eq(schema.prices.id, existingPrice.id));
          }
        } else {
          // First time — insert price + initial history record
          await db.insert(schema.prices).values({
            productMatchId: match.matchId,
            priceCents: normalized.priceCents,
            unitSize: normalized.unitSize,
            unitType: normalized.unitType,
            unitPriceCents: normalized.unitPriceCents,
            fetchedAt: now,
          });

          await db.insert(schema.priceHistory).values({
            productMatchId: match.matchId,
            priceCents: normalized.priceCents,
            unitPriceCents: normalized.unitPriceCents,
            validFrom: now,
          });
        }

        updated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${match.productName}: ${msg}`);
        failed++;
        console.error(`[pipeline] ${source.storeSlug}: error processing "${match.productName}": ${msg}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const status = failed === 0 ? "success" : failed < matches.length ? "partial" : "failed";

    // 5. Update pipeline run log
    await db
      .update(schema.pipelineRuns)
      .set({
        status,
        productsFetched: fetched,
        productsUpdated: updated,
        productsFailed: failed,
        errorMessage: errors.length > 0 ? errors.join("\n") : null,
        completedAt: new Date(),
        durationMs,
      })
      .where(eq(schema.pipelineRuns.id, run.id));

    const result: PipelineRunResult = {
      storeSlug: source.storeSlug,
      status,
      productsFetched: fetched,
      productsUpdated: updated,
      productsFailed: failed,
      errors,
      durationMs,
    };

    console.log(
      `[pipeline] ${source.storeSlug}: ${status} — fetched=${fetched}, updated=${updated}, failed=${failed} (${durationMs}ms)`,
    );

    return result;
  } catch (error) {
    // Fatal error — mark run as failed
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : String(error);

    await db
      .update(schema.pipelineRuns)
      .set({
        status: "failed",
        errorMessage: msg,
        completedAt: new Date(),
        durationMs,
      })
      .where(eq(schema.pipelineRuns.id, run.id));

    console.error(`[pipeline] ${source.storeSlug}: FATAL — ${msg}`);

    return {
      storeSlug: source.storeSlug,
      status: "failed",
      productsFetched: fetched,
      productsUpdated: updated,
      productsFailed: failed,
      errors: [msg],
      durationMs,
    };
  }
}

/** Run pipeline for all configured stores */
export async function runFullPipeline(sources: StoreSource[]): Promise<PipelineRunResult[]> {
  console.log(`[pipeline] Starting full pipeline for ${sources.length} stores...`);
  const results: PipelineRunResult[] = [];

  for (const source of sources) {
    const result = await runPipelineForStore(source);
    results.push(result);
  }

  console.log("[pipeline] Full pipeline complete.");
  return results;
}

/** Run pipeline and close DB connection (for one-shot execution) */
export async function runOnce(sources: StoreSource[]): Promise<void> {
  try {
    const results = await runFullPipeline(sources);

    console.log("\n[pipeline] === Summary ===");
    for (const r of results) {
      console.log(
        `  ${r.storeSlug}: ${r.status} — ${r.productsUpdated}/${r.productsFetched} updated, ${r.productsFailed} failed (${r.durationMs}ms)`,
      );
    }
  } finally {
    await closeDb();
  }
}
