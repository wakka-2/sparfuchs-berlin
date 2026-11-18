import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { storeOffers, stores } from "../db/schema.js";
import { formatCents, formatUnitPrice } from "../lib/response.js";

export interface OfferListParams {
  store?: string;
  q?: string;
  /** offer = weekly flyer offers, regular = everyday shelf prices */
  type: "offer" | "regular" | "all";
  category?: string;
  /** relevance (default), price (pack, low first) or unit_price (per kg/L/piece, low first) */
  sort: "relevance" | "price" | "unit_price";
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

export async function listOffers({ store, q, type, category, sort, page, limit }: OfferListParams) {
  // Filters shared by the list and the per-store counts (store filter excluded
  // from counts, so the chips always show what each store has).
  const base: SQL[] = [isCurrent, eq(stores.isActive, true)];
  if (type !== "all") base.push(eq(storeOffers.isOffer, type === "offer"));
  if (q) {
    const term = likeTerm(q);
    base.push(or(ilike(storeOffers.name, term), ilike(storeOffers.description, term))!);
  }
  // Each chip row counts with every filter except its own.
  const storeFilter = store ? [eq(stores.slug, store)] : [];
  const categoryFilter = category ? [eq(storeOffers.category, category)] : [];
  const where = and(...base, ...storeFilter, ...categoryFilter);

  const relevance = [
    // Search ranking: "eier" → "Bio-Eier", then "Eierlikör", then
    // "Bachmeier", then offers that only mention it in the description.
    ...(q ? [sql`CASE WHEN ${storeOffers.name} ~* ${wholeWord(q)} THEN 0
                      WHEN ${storeOffers.name} ~* ${wordStart(q)} THEN 1
                      WHEN ${storeOffers.name} ILIKE ${likeTerm(q)} THEN 2 ELSE 3 END`] : []),
    desc(storeOffers.isOffer),
    asc(storeOffers.name),
  ];
  const order =
    sort === "price" ? [asc(storeOffers.priceCents), asc(storeOffers.name)]
    : sort === "unit_price" ? [sql`${storeOffers.unitPriceCents} ASC NULLS LAST`, asc(storeOffers.name)]
    : relevance;

  const [rows, [{ total }], perStore, perCategory] = await Promise.all([
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
        category: storeOffers.category,
        unitPriceCents: storeOffers.unitPriceCents,
        unitKind: storeOffers.unitKind,
        matchKey: storeOffers.matchKey,
        storeId: storeOffers.storeId,
      })
      .from(storeOffers)
      .innerJoin(stores, eq(stores.id, storeOffers.storeId))
      .where(where)
      .orderBy(...order, asc(storeOffers.id))
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
      .where(and(...base, ...categoryFilter))
      .groupBy(stores.slug),
    db
      .select({ category: storeOffers.category, n: count() })
      .from(storeOffers)
      .innerJoin(stores, eq(stores.id, storeOffers.storeId))
      .where(and(...base, ...storeFilter))
      .groupBy(storeOffers.category),
  ]);

  // The very same product (exact match key) at other stores, current only.
  const keys = [...new Set(rows.map((r) => r.matchKey).filter((k): k is string => !!k))];
  const siblings = keys.length
    ? await db
        .select({
          matchKey: storeOffers.matchKey,
          storeId: storeOffers.storeId,
          storeName: stores.name,
          storeSlug: stores.slug,
          priceCents: storeOffers.priceCents,
        })
        .from(storeOffers)
        .innerJoin(stores, eq(stores.id, storeOffers.storeId))
        .where(and(isCurrent, eq(stores.isActive, true), inArray(storeOffers.matchKey, keys)))
    : [];

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
      category: r.category,
      unit_price_formatted:
        r.unitPriceCents != null && r.unitKind ? formatUnitPrice(r.unitPriceCents, r.unitKind) : null,
      also_at: r.matchKey
        ? cheapestPerStore(siblings.filter((s) => s.matchKey === r.matchKey && s.storeId !== r.storeId))
        : [],
    })),
    total,
    store_counts: Object.fromEntries(perStore.map((s) => [s.slug, s.n])),
    category_counts: Object.fromEntries(perCategory.map((c) => [c.category ?? "sonstiges", c.n])),
  };
}

/** One entry per other store (its cheapest listing of the product), cheapest first. */
function cheapestPerStore(rows: Array<{ storeSlug: string; storeName: string; priceCents: number }>) {
  const best = new Map<string, { storeSlug: string; storeName: string; priceCents: number }>();
  for (const r of rows) {
    const cur = best.get(r.storeSlug);
    if (!cur || r.priceCents < cur.priceCents) best.set(r.storeSlug, r);
  }
  return [...best.values()]
    .sort((a, b) => a.priceCents - b.priceCents)
    .map((r) => ({ store_slug: r.storeSlug, store_name: r.storeName, price_formatted: formatCents(r.priceCents) }));
}
