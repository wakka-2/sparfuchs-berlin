/**
 * "If you only go to one shop": the store that covers most of the list,
 * cheapest on a tie — and what that convenience costs compared with buying
 * the same items wherever each is cheapest.
 */
export interface BasketForPlan {
  items: Array<{ product_id: string; name: string; prices: Record<string, { subtotal_cents: number }> }>;
  totals: Record<string, { store_name: string; total_cents: number; items_available: number; missing_products: string[] }>;
}

export interface OneStorePick {
  slug: string;
  storeName: string;
  covered: number;
  /** Everything on the list, including items no store has a price for */
  listSize: number;
  totalCents: number;
  /** Extra versus buying the covered items at their cheapest store each (>= 0) */
  extraCents: number;
  missing: string[];
}

export function pickOneStore(result: BasketForPlan, listSize: number): OneStorePick | null {
  const ranked = Object.entries(result.totals)
    .filter(([, t]) => t.items_available > 0)
    .sort((a, b) => b[1].items_available - a[1].items_available || a[1].total_cents - b[1].total_cents);
  if (ranked.length === 0) return null;
  const [slug, t] = ranked[0];

  let cheapestElsewhere = 0;
  for (const item of result.items) {
    if (!item.prices[slug]) continue;
    cheapestElsewhere += Math.min(...Object.values(item.prices).map((p) => p.subtotal_cents));
  }
  const pricedIds = new Set(result.items.map((i) => i.product_id));
  return {
    slug,
    storeName: t.store_name,
    covered: t.items_available,
    listSize: Math.max(listSize, pricedIds.size),
    totalCents: t.total_cents,
    extraCents: Math.max(0, t.total_cents - cheapestElsewhere),
    missing: t.missing_products,
  };
}
