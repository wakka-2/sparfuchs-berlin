import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { storeOffers, stores } from "../db/schema.js";
import { formatCents } from "../lib/response.js";

export interface OfferListParams {
  store?: string;
  q?: string;
  /** offer = weekly flyer offers, regular = everyday shelf prices */
  type: "offer" | "regular" | "all";
  page: number;
  limit: number;
}

const isCurrent = sql`${storeOffers.validUntil} >= (now() AT TIME ZONE 'Europe/Berlin')::date`;

/** Escape LIKE wildcards so a search for "100%" matches literally. */
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);
const likeTerm = (q: string) => `%${escapeLike(q)}%`;
const reEscape = (q: string) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Postgres regexes: the term as a whole word ("Bio-Eier"), or starting one ("Eierlikör"). */
const wholeWord = (q: string) => `\\m${reEscape(q)}\\M`;
const wordStart = (q: string) => `\\m${reEscape(q)}`;

export async function listOffers({ store, q, type, page, limit }: OfferListParams) {
  // Filters shared by the list and the per-store counts (store filter excluded
  // from counts, so the chips always show what each store has).
  const base: SQL[] = [isCurrent, eq(stores.isActive, true)];
  if (type !== "all") base.push(eq(storeOffers.isOffer, type === "offer"));
  if (q) {
    const term = likeTerm(q);
    base.push(or(ilike(storeOffers.name, term), ilike(storeOffers.description, term))!);
  }
  const where = store ? and(...base, eq(stores.slug, store)) : and(...base);

  const [rows, [{ total }], perStore] = await Promise.all([
    db
      .select({
        id: storeOffers.id,
        storeSlug: stores.slug,
        storeName: stores.name,
        storeColor: stores.colorHex,
        name: storeOffers.name,
        priceCents: storeOffers.priceCents,
        unitText: storeOffers.unitText,
        baseText: storeOffers.baseText,
        imageUrl: storeOffers.imageUrl,
        url: storeOffers.url,
        isOffer: storeOffers.isOffer,
        validUntil: storeOffers.validUntil,
      })
      .from(storeOffers)
      .innerJoin(stores, eq(stores.id, storeOffers.storeId))
      .where(where)
      .orderBy(
        // Search ranking: "eier" → "Bio-Eier", then "Eierlikör", then
        // "Bachmeier", then offers that only mention it in the description.
        ...(q ? [sql`CASE WHEN ${storeOffers.name} ~* ${wholeWord(q)} THEN 0
                          WHEN ${storeOffers.name} ~* ${wordStart(q)} THEN 1
                          WHEN ${storeOffers.name} ILIKE ${likeTerm(q)} THEN 2 ELSE 3 END`] : []),
        desc(storeOffers.isOffer),
        asc(storeOffers.name),
        asc(storeOffers.id),
      )
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ total: count() })
      .from(storeOffers)
      .innerJoin(stores, eq(stores.id, storeOffers.storeId))
      .where(where),
    db
      .select({ slug: stores.slug, n: count() })
      .from(storeOffers)
      .innerJoin(stores, eq(stores.id, storeOffers.storeId))
      .where(and(...base))
      .groupBy(stores.slug),
  ]);

  return {
    offers: rows.map((r) => ({
      id: r.id,
      store_slug: r.storeSlug,
      store_name: r.storeName,
      store_color: r.storeColor,
      name: r.name,
      price_cents: r.priceCents,
      price_formatted: formatCents(r.priceCents),
      unit_text: r.unitText,
      base_text: r.baseText,
      image_url: r.imageUrl,
      url: r.url,
      is_offer: r.isOffer,
      valid_until: r.validUntil,
    })),
    total,
    store_counts: Object.fromEntries(perStore.map((s) => [s.slug, s.n])),
  };
}
