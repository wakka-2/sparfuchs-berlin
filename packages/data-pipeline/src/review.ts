/**
 * The review queue: price checks and AI match suggestions a person decides on.
 * Decisions feed back into matching on the next run (see loadDecisions).
 */
import Anthropic from "@anthropic-ai/sdk";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "./db.js";
import type { MatchDecisions } from "./catalog.js";
import { classifyNames, matchReviews, MODEL, MIN_CONFIDENCE, type Label } from "./classify.js";
import { ruleMatches } from "./catalog.js";
import type { Offer } from "./types.js";

const toCents = (euros: number) => Math.round(euros * 100);
/**
 * New names sent to the AI per run (2 batches by default, ≈ 0,10–0,15 $).
 * The first pass over ~2,500 names then spreads over a few days; raise
 * AI_MAX_NAMES to go faster.
 */
const MAX_NEW_NAMES_PER_RUN = Math.max(0, Number(process.env.AI_MAX_NAMES ?? 160)) || 160;

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
    let saved = 0;
    try {
      await classifyNames(new Anthropic(), unseen, async (batch) => {
        const rows = [...batch].map(([nameKey, l]) => ({ nameKey, productName: l.product, confidence: l.confidence, model: MODEL }));
        if (rows.length) await db.insert(schema.offerClassifications).values(rows).onConflictDoNothing();
        for (const [k, l] of batch) known.set(k, l);
        saved += rows.length;
      });
    } catch (error) {
      // Out of credit, rate limit, outage: keep what was saved and still queue reviews for it.
      console.warn(`[review] AI stopped early after ${saved} names — ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log(`[review] AI classified ${saved} new offer names (${keys.length - known.size} still to do)`);
    logAgreement(offersByStore, known, new Set(unseen.map((u) => u.key)));
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

/**
 * How the AI's answers for this run's names compare with the hand-checked
 * catalog rules — the quick precision check, printed to the run log.
 */
function logAgreement(offersByStore: Map<string, Offer[]>, labels: Map<string, Label>, keys: Set<string>) {
  const seen = new Set<string>();
  let agree = 0, aiOnly = 0, rulesOnly = 0, bothNone = 0, unsure = 0;
  const examples: string[] = [];
  for (const offers of offersByStore.values()) {
    for (const o of offers) {
      const key = o.name.toLowerCase().slice(0, 300);
      if (!keys.has(key) || seen.has(key)) continue;
      seen.add(key);
      const label = labels.get(key);
      if (!label) continue;
      if (label.confidence < MIN_CONFIDENCE) { unsure++; continue; }
      const rules = ruleMatches(o);
      if (label.product && rules.includes(label.product)) agree++;
      else if (!label.product && rules.length === 0) bothNone++;
      else if (label.product && rules.length === 0) { aiOnly++; if (examples.length < 12) examples.push(`AI says "${label.product}", no rule: ${o.name}`); }
      else { rulesOnly++; if (examples.length < 12) examples.push(`rule says "${rules.join(", ")}", AI says "${label.product ?? "none"}": ${o.name}`); }
    }
  }
  const matched = agree + aiOnly + rulesOnly;
  console.log(
    `[review] agreement on ${seen.size} names: ${agree} same product, ${bothNone} both "not a catalog product", ` +
      `${aiOnly} AI-only, ${rulesOnly} rules-only/different, ${unsure} AI unsure` +
      (matched ? ` — AI agrees with the rules on ${Math.round((100 * agree) / matched)} % of catalog matches` : ""),
  );
  for (const e of examples) console.log(`[review]   ${e}`);
}
