import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { offerReviews, products, stores } from "../db/schema.js";
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
    .set({ status, decidedAt: new Date() })
    .where(eq(offerReviews.id, id))
    .returning({ id: offerReviews.id });
  return updated.length > 0;
}
