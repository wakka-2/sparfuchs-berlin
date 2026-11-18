import { eq, and, inArray, sql } from "drizzle-orm";
import { db, schema, closeDb } from "./db.js";
import { closeBrowser } from "./browser.js";
import { rankOffers, priceProblem, CATALOG } from "./catalog.js";
import { suggestMatchReviews, loadDecisions, queueReview, priceKey } from "./review.js";
import type { Offer, StoreSource, PipelineRunResult } from "./types.js";
import { berlinDate, saturdayOf } from "./http.js";
import { offerFacts } from "./offerFacts.js";

const toCents = (euros: number) => Math.round(euros * 100);

/**
 * Run one store:
 * 1. Read every offer the store publishes this week
 * 2. Pick the best-value matching offer per catalog product (catalog.ts)
 * 3. Write it as the product's current price there; history on change
 * 4. Remove the current price of products that are no longer on offer
 *
 * If the store cannot be read at all, nothing is written: existing prices
 * keep their own valid_until and drop off the site when the offer ends, so a
 * broken scraper can never leave stale prices showing as current.
 */
export async function runPipelineForStore(
  source: StoreSource,
  /** Receives the store's offers, for the AI review step after all stores ran */
  collect?: Map<string, Offer[]>,
): Promise<PipelineRunResult> {
  const startTime = Date.now();
  console.log(`[pipeline] Starting ${source.storeSlug}...`);

  const [store] = await db
    .select()
    .from(schema.stores)
    .where(eq(schema.stores.slug, source.storeSlug))
    .limit(1);
  if (!store) throw new Error(`Store "${source.storeSlug}" not found in database`);

  const [run] = await db
    .insert(schema.pipelineRuns)
    .values({ storeId: store.id, status: "running" })
    .returning();

  const finish = async (result: Omit<PipelineRunResult, "storeSlug" | "durationMs">) => {
    const durationMs = Date.now() - startTime;
    await db
      .update(schema.pipelineRuns)
      .set({
        status: result.status,
        productsFetched: result.productsFetched,
        productsUpdated: result.productsUpdated,
        productsFailed: result.productsFailed,
        errorMessage: result.errors.length > 0 ? result.errors.join("\n") : null,
        completedAt: new Date(),
        durationMs,
      })
      .where(eq(schema.pipelineRuns.id, run.id));
    console.log(
      `[pipeline] ${source.storeSlug}: ${result.status} — ${result.productsFetched} offers, ` +
        `${result.productsUpdated} catalog products priced (${durationMs}ms)`,
    );
    return { ...result, storeSlug: source.storeSlug, durationMs };
  };

  let offers;
  try {
    offers = await source.fetchOffers();
    // An empty flyer means the page changed under us, not that nothing is on offer.
    if (offers.length === 0) throw new Error("store returned 0 offers — scraper needs attention");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[pipeline] ${source.storeSlug}: FAILED — ${msg}`);
    return finish({ status: "failed", productsFetched: 0, productsUpdated: 0, productsFailed: 0, errors: [msg] });
  }

  try {
    await replaceStoreOffers(store.id, offers);
  } catch (error) {
    // Browsing is secondary; the comparison prices below must still be written.
    console.error(`[pipeline] ${source.storeSlug}: store_offers not written — ${String(error)}`);
  }

  collect?.set(source.storeSlug, offers);

  const { decisions, approvedPrices } = await loadDecisions();
  const ranked = rankOffers(offers, CATALOG, decisions);
  const matches = await db
    .select({
      matchId: schema.productMatches.id,
      productId: schema.products.id,
      productName: schema.products.nameDe,
      previousUnitCents: schema.prices.unitPriceCents,
      previousName: schema.productMatches.externalName,
    })
    .from(schema.productMatches)
    .innerJoin(schema.products, eq(schema.products.id, schema.productMatches.productId))
    .leftJoin(schema.prices, eq(schema.prices.productMatchId, schema.productMatches.id))
    .where(
      and(
        eq(schema.productMatches.storeId, store.id),
        eq(schema.productMatches.isActive, true),
        eq(schema.products.isActive, true),
      ),
    );

  const errors: string[] = [];
  const offMatchIds: string[] = [];
  let updated = 0;
  let held = 0;
  const now = new Date();

  for (const match of matches) {
    // Cheapest believable offer: an implausible unit price is held for review
    // (unless a person approved that exact price) and the next one is tried.
    let hit;
    for (const cand of ranked.get(match.productName) ?? []) {
      // A 3x jump only means something for the same listing (usually a parse
      // error); switching to a different, cheaper product is expected.
      const sameListing = match.previousName === cand.offer.name && match.previousUnitCents != null;
      const problem = priceProblem(
        match.productName,
        cand.unitPrice,
        sameListing ? match.previousUnitCents! / 100 : null,
      );
      if (!problem || approvedPrices.has(priceKey(cand.offer.name, match.productId, toCents(cand.offer.price)))) {
        hit = cand;
        break;
      }
      held++;
      await queueReview({
        key: priceKey(cand.offer.name, match.productId, toCents(cand.offer.price)),
        kind: "price",
        storeId: store.id,
        productId: match.productId,
        offer: cand.offer,
        unitPriceCents: toCents(cand.unitPrice),
        reason: problem,
      });
    }
    if (!hit) {
      if (!CATALOG[match.productName]) errors.push(`no catalog rule for "${match.productName}"`);
      offMatchIds.push(match.matchId);
      continue;
    }
    const { offer, unitPrice } = hit;
    const priceCents = toCents(offer.price);
    const unitPriceCents = toCents(unitPrice);

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.productMatches)
          .set({
            externalName: offer.name.slice(0, 300),
            externalUrl: offer.url?.slice(0, 500) ?? null,
            imageUrl: offer.imageUrl?.slice(0, 500) ?? null,
            updatedAt: now,
          })
          .where(eq(schema.productMatches.id, match.matchId));

        const [existing] = await tx
          .select()
          .from(schema.prices)
          .where(eq(schema.prices.productMatchId, match.matchId))
          .limit(1);

        const values = {
          priceCents,
          unitSize: offer.unitText.slice(0, 50),
          unitType: CATALOG[match.productName].unit,
          unitPriceCents,
          isEstimated: false,
          isOffer: !offer.regular,
          validUntil: offer.validUntil ?? null,
          fetchedAt: now,
        };

        if (!existing) {
          await tx.insert(schema.prices).values({ productMatchId: match.matchId, ...values });
        } else {
          await tx.update(schema.prices).set(values).where(eq(schema.prices.id, existing.id));
        }

        // History records each distinct offer once: close the open row when the
        // price changes (or there was none), then open a new one.
        if (!existing || existing.priceCents !== priceCents) {
          await tx
            .update(schema.priceHistory)
            .set({ validUntil: now })
            .where(
              and(
                eq(schema.priceHistory.productMatchId, match.matchId),
                sql`${schema.priceHistory.validUntil} IS NULL`,
              ),
            );
          await tx.insert(schema.priceHistory).values({
            productMatchId: match.matchId,
            priceCents,
            unitPriceCents,
            validFrom: now,
          });
        }
      });
      updated++;
    } catch (error) {
      errors.push(`${match.productName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Not on offer any more: drop the current price and close its history row.
  if (offMatchIds.length > 0) {
    await db.delete(schema.prices).where(inArray(schema.prices.productMatchId, offMatchIds));
    await db
      .update(schema.priceHistory)
      .set({ validUntil: now })
      .where(
        and(
          inArray(schema.priceHistory.productMatchId, offMatchIds),
          sql`${schema.priceHistory.validUntil} IS NULL`,
        ),
      );
    await db
      .update(schema.productMatches)
      .set({ imageUrl: null, externalName: null, externalUrl: null, updatedAt: now })
      .where(inArray(schema.productMatches.id, offMatchIds));
  }

  if (held > 0) console.log(`[pipeline] ${source.storeSlug}: ${held} implausible price(s) held for review`);

  return finish({
    status: errors.length === 0 ? "success" : "failed",
    productsFetched: offers.length,
    productsUpdated: updated,
    productsFailed: errors.length,
    errors,
  });
}

/** Replace a store's browsable offers with this run's, in one transaction. */
async function replaceStoreOffers(storeId: string, offers: Offer[]): Promise<void> {
  const fallbackUntil = saturdayOf(berlinDate());
  const rows = offers.map((o) => ({
    storeId,
    name: o.name.slice(0, 300),
    description: o.description ?? null,
    priceCents: toCents(o.price),
    unitText: o.unitText.slice(0, 100),
    baseText: o.baseText?.slice(0, 100) ?? null,
    imageUrl: o.imageUrl?.slice(0, 500) ?? null,
    url: o.url?.slice(0, 500) ?? null,
    isOffer: !o.regular,
    validUntil: o.validUntil ?? fallbackUntil,
    ...offerFacts(o),
  }));
  await db.transaction(async (tx) => {
    await tx.delete(schema.storeOffers).where(eq(schema.storeOffers.storeId, storeId));
    for (let i = 0; i < rows.length; i += 500) {
      await tx.insert(schema.storeOffers).values(rows.slice(i, i + 500));
    }
  });
}

/**
 * Product photo = the photo of the best-value current offer, so the picture
 * always shows something that is really for sale. Products with no current
 * offer keep their last photo, which also came from a rule-matched offer.
 */
async function refreshProductImages(): Promise<void> {
  await db.execute(sql`
    UPDATE products p
       SET image_url = best.image_url, updated_at = now()
      FROM (
        SELECT DISTINCT ON (pm.product_id) pm.product_id, pm.image_url
          FROM product_matches pm
          JOIN prices pr ON pr.product_match_id = pm.id
          JOIN stores s ON s.id = pm.store_id AND s.is_active
         WHERE pm.is_active AND pm.image_url IS NOT NULL
           AND pr.valid_until >= (now() AT TIME ZONE 'Europe/Berlin')::date
         ORDER BY pm.product_id, pr.unit_price_cents
      ) best
     WHERE p.id = best.product_id
       AND p.image_url IS DISTINCT FROM best.image_url
  `);
}

/** Run every store, then refresh product photos from the result. */
export async function runFullPipeline(sources: StoreSource[]): Promise<PipelineRunResult[]> {
  console.log(`[pipeline] Starting full pipeline for ${sources.length} stores...`);
  const results: PipelineRunResult[] = [];
  const offersByStore = new Map<string, Offer[]>();
  for (const source of sources) {
    try {
      results.push(await runPipelineForStore(source, offersByStore));
    } catch (error) {
      // A DB-level failure for one store must not stop the others.
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[pipeline] ${source.storeSlug}: FATAL — ${msg}`);
      results.push({
        storeSlug: source.storeSlug, status: "failed", productsFetched: 0,
        productsUpdated: 0, productsFailed: 0, errors: [msg], durationMs: 0,
      });
    }
  }
  await refreshProductImages();
  try {
    await suggestMatchReviews(offersByStore);
  } catch (error) {
    // The AI step only adds review items; it must never fail the price run.
    console.error(`[review] AI suggestions skipped — ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log("[pipeline] Full pipeline complete.");
  return results;
}

/**
 * Run the pipeline once and release everything that keeps the process alive
 * (the shared browser holds the event loop open — see PR #9). Exits non-zero
 * when any store failed, so CI shows a red run instead of a silent green one.
 */
export async function runOnce(sources: StoreSource[]): Promise<void> {
  let failed: boolean;
  try {
    const results = await runFullPipeline(sources);
    console.log("\n[pipeline] === Summary ===");
    for (const r of results) {
      console.log(
        `  ${r.storeSlug}: ${r.status} — ${r.productsFetched} offers, ${r.productsUpdated} products priced (${r.durationMs}ms)`,
      );
      for (const e of r.errors) console.log(`    ! ${e}`);
    }
    failed = results.some((r) => r.status === "failed");
  } finally {
    await closeBrowser().catch((err: unknown) =>
      console.warn(`[pipeline] Failed to close browser: ${String(err)}`),
    );
    await closeDb();
  }
  if (failed) process.exitCode = 1;
}
