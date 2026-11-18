import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { aiReviewRuns, offerReviews, products, stores } from "../db/schema.js";
import { formatCents } from "../lib/response.js";

export type ReviewStatus = "pending" | "approved" | "rejected";

/** Review items, newest first, with the names a person needs to decide. */
export async function listReviews(status: ReviewStatus) {
  const rows = await db
    .select({
      id: offerReviews.id,
      kind: offerReviews.kind,
      status: offerReviews.status,
      storeName: stores.name,
      storeColor: stores.colorHex,
      productName: products.nameDe,
      offerName: offerReviews.offerName,
      unitText: offerReviews.unitText,
      priceCents: offerReviews.priceCents,
      unitPriceCents: offerReviews.unitPriceCents,
      imageUrl: offerReviews.imageUrl,
      url: offerReviews.url,
      reason: offerReviews.reason,
      createdAt: offerReviews.createdAt,
    })
    .from(offerReviews)
    .innerJoin(stores, eq(stores.id, offerReviews.storeId))
    .innerJoin(products, eq(products.id, offerReviews.productId))
    .where(eq(offerReviews.status, status))
    .orderBy(desc(offerReviews.createdAt))
    .limit(200);

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    store_name: r.storeName,
    store_color: r.storeColor,
    product_name: r.productName,
    offer_name: r.offerName,
    unit_text: r.unitText,
    price_formatted: formatCents(r.priceCents),
    unit_price_cents: r.unitPriceCents,
    image_url: r.imageUrl,
    url: r.url,
    reason: r.reason,
    created_at: r.createdAt.toISOString(),
  }));
}

/** Record a decision. Returns false when the item does not exist. */
export async function decideReview(id: string, status: Exclude<ReviewStatus, "pending">): Promise<boolean> {
  const updated = await db
    .update(offerReviews)
    .set({ status, decidedAt: new Date(), decidedBy: "human" })
    .where(eq(offerReviews.id, id))
    .returning({ id: offerReviews.id });
  return updated.length > 0;
}

/**
 * How good the AI has been, judged by people's decisions. Every question on
 * /pruefen is "Is this product X?":
 * - AI suggested X (no rule matched): "yes" means the AI was right.
 * - AI doubted a rule's X: "no" means the AI was right.
 */
export async function aiStats() {
  const [decided] = await db
    .select({
      right: sql<number>`count(*) filter (where (${offerReviews.reason} like '%keine Regel%' and ${offerReviews.status} = 'approved')
                                     or (${offerReviews.reason} not like '%keine Regel%' and ${offerReviews.status} = 'rejected'))`.mapWith(Number),
      decided: sql<number>`count(*) filter (where ${offerReviews.status} <> 'pending')`.mapWith(Number),
      pending: sql<number>`count(*) filter (where ${offerReviews.status} = 'pending')`.mapWith(Number),
    })
    .from(offerReviews)
    // Only people's decisions are the reference; the AI judge grading itself would prove nothing.
    .where(sql`${offerReviews.kind} = 'match' and ${offerReviews.reason} like 'KI%' and coalesce(${offerReviews.decidedBy}, 'human') = 'human'`);
  const runs = await db.select().from(aiReviewRuns).orderBy(desc(aiReviewRuns.createdAt)).limit(30);
  return {
    decisions: {
      decided: decided.decided,
      ai_right: decided.right,
      pending: decided.pending,
      precision: decided.decided ? decided.right / decided.decided : null,
    },
    runs: runs.map((r) => {
      const matched = r.agree + r.aiOnly + r.rulesOnly;
      return {
        at: r.createdAt.toISOString(), model: r.model, names: r.names, agree: r.agree, both_none: r.bothNone,
        ai_only: r.aiOnly, rules_only: r.rulesOnly, unsure: r.unsure,
        agreement: matched ? r.agree / matched : null,
        input_tokens: r.inputTokens, cached_tokens: r.cachedTokens, output_tokens: r.outputTokens,
      };
    }),
  };
}
