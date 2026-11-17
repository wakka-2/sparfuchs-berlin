/**
 * The review queue: price checks and AI match suggestions a person decides on.
 * Decisions feed back into matching on the next run (see loadDecisions).
 */
import Anthropic from "@anthropic-ai/sdk";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import type { MatchDecisions } from "./catalog.js";
import { classifyNames, matchReviews, MODEL, type Label } from "./classify.js";
import type { Offer } from "./types.js";

const toCents = (euros: number) => Math.round(euros * 100);
/** First run sees ~2,500 names; spread them over a few days to bound one run's cost. */
const MAX_NEW_NAMES_PER_RUN = 600;

export const priceKey = (name: string, productId: string, cents: number) =>
  `price|${name.toLowerCase().slice(0, 300)}|${productId}|${cents}`;
export const matchKey = (name: string, productId: string) => `match|${name.toLowerCase().slice(0, 300)}|${productId}`;

/** What people decided in the review queue, in the shape the matcher needs. */
export async function loadDecisions(): Promise<{ decisions: MatchDecisions; approvedPrices: Set<string> }> {
  const rows = await db
    .select({
      key: schema.offerReviews.key,
      kind: schema.offerReviews.kind,
      status: schema.offerReviews.status,
      offerName: schema.offerReviews.offerName,
      productName: schema.products.nameDe,
    })
    .from(schema.offerReviews)
    .innerJoin(schema.products, eq(schema.products.id, schema.offerReviews.productId))
    .where(inArray(schema.offerReviews.status, ["approved", "rejected"]));

  const decisions: MatchDecisions = { approved: new Map(), rejected: new Map() };
  const approvedPrices = new Set<string>();
  for (const r of rows) {
    if (r.kind === "price") {
      if (r.status === "approved") approvedPrices.add(r.key);
      continue;
    }
    const map = r.status === "approved" ? decisions.approved : decisions.rejected;
    const name = r.offerName.toLowerCase();
    map.set(name, (map.get(name) ?? new Set()).add(r.productName));
  }
  return { decisions, approvedPrices };
}

/** Add a review item unless the same question was already asked (or decided). */
export async function queueReview(r: {
  key: string;
  kind: "match" | "price";
  storeId: string;
  productId: string;
  offer: Offer;
  unitPriceCents?: number;
  reason: string;
}): Promise<void> {
  await db
    .insert(schema.offerReviews)
    .values({
      key: r.key,
      kind: r.kind,
      storeId: r.storeId,
      productId: r.productId,
      offerName: r.offer.name.slice(0, 300),
      unitText: r.offer.unitText.slice(0, 100),
      priceCents: toCents(r.offer.price),
      unitPriceCents: r.unitPriceCents ?? null,
      imageUrl: r.offer.imageUrl?.slice(0, 500) ?? null,
      url: r.offer.url?.slice(0, 500) ?? null,
      reason: r.reason,
    })
    .onConflictDoNothing({ target: schema.offerReviews.key });
}


/**
 * Ask the AI about offer names it has not seen, then queue a review item
 * wherever its answer and the catalog rules disagree. Needs ANTHROPIC_API_KEY;
 * without it the step is skipped (prices are unaffected either way).
 */
export async function suggestMatchReviews(offersByStore: Map<string, Offer[]>): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[review] ANTHROPIC_API_KEY not set — AI match suggestions skipped");
    return;
  }

  const byKey = new Map<string, { key: string; name: string; description?: string }>();
  for (const offers of offersByStore.values()) {
    for (const o of offers) {
      const key = o.name.toLowerCase().slice(0, 300);
      if (!byKey.has(key)) byKey.set(key, { key, name: o.name, description: o.description });
    }
  }
  const keys = [...byKey.keys()];

  const known = new Map<string, Label>();
  for (let i = 0; i < keys.length; i += 1000) {
    const rows = await db
      .select()
      .from(schema.offerClassifications)
      .where(inArray(schema.offerClassifications.nameKey, keys.slice(i, i + 1000)));
    for (const r of rows) known.set(r.nameKey, { product: r.productName, confidence: r.confidence ?? 0 });
  }

  const unseen = keys.filter((k) => !known.has(k)).slice(0, MAX_NEW_NAMES_PER_RUN).map((k) => byKey.get(k)!);
  if (unseen.length > 0) {
    const fresh = await classifyNames(new Anthropic(), unseen);
    const rows = [...fresh].map(([nameKey, l]) => ({ nameKey, productName: l.product, confidence: l.confidence, model: MODEL }));
    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(schema.offerClassifications).values(rows.slice(i, i + 500)).onConflictDoNothing();
    }
    for (const [k, l] of fresh) known.set(k, l);
    console.log(`[review] AI classified ${fresh.size} new offer names (${keys.length - known.size} still to do)`);
  }

  const [stores, products] = await Promise.all([
    db.select({ id: schema.stores.id, slug: schema.stores.slug }).from(schema.stores),
    db.select({ id: schema.products.id, name: schema.products.nameDe }).from(schema.products).where(eq(schema.products.isActive, true)),
  ]);
  const storeId = new Map(stores.map((s) => [s.slug, s.id]));
  const productId = new Map(products.map((p) => [p.name, p.id]));

  let queued = 0;
  for (const r of matchReviews(offersByStore, known)) {
    const sid = storeId.get(r.storeSlug);
    const pid = productId.get(r.product);
    if (!sid || !pid) continue;
    await queueReview({ key: matchKey(r.offer.name, pid), kind: "match", storeId: sid, productId: pid, offer: r.offer, reason: r.reason });
    queued++;
  }
  console.log(`[review] ${queued} AI match question(s) checked against the queue`);
}
