import type { Product, StorePrice } from "./api";

export interface FeaturedOffer {
  product: Product;
  best: StorePrice;
  dearest: StorePrice;
  /** How much cheaper per unit than the dearest store, in percent */
  pct: number;
}

/**
 * The offers worth putting on the banner:
 * - the cheapest price is a real flyer offer this week (not an everyday price),
 * - another store sells it too, so the saving is a real comparison,
 * - it saves at least 10 % per kg / L / piece,
 * ranked by that saving, one product per category for variety.
 */
export function pickFeatured(products: Product[], max = 5): FeaturedOffer[] {
  const candidates: FeaturedOffer[] = [];
  for (const product of products) {
    const [best, ...rest] = product.prices; // sorted by unit price
    const dearest = rest.at(-1);
    if (!best?.is_offer || !dearest || dearest.unit_price_cents <= 0) continue;
    const pct = Math.round((1 - best.unit_price_cents / dearest.unit_price_cents) * 100);
    if (pct >= 10) candidates.push({ product, best, dearest, pct });
  }
  candidates.sort((a, b) => b.pct - a.pct);

  const picked: FeaturedOffer[] = [];
  const categories = new Set<string>();
  for (const c of candidates) {
    if (categories.has(c.product.category.slug)) continue;
    categories.add(c.product.category.slug);
    picked.push(c);
    if (picked.length === max) return picked;
  }
  // Fewer categories than slots: top up with the next-best savings.
  for (const c of candidates) {
    if (picked.length === max) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}
