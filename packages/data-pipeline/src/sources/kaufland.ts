/**
 * Kaufland — weekly in-store offers from filiale.kaufland.de
 *
 * The page embeds every offer as structured JSON (window.SSR[...]): price,
 * pack size, base price, sales window, image. No browser needed.
 */
import type { Offer, StoreSource } from "../types.js";
import { fetchText, berlinDate } from "../http.js";

const OFFERS_URL = "https://filiale.kaufland.de/angebote/uebersicht.html";

interface KauflandOffer {
  offerId: string;
  title?: string;
  subtitle?: string;
  detailDescription?: string;
  price?: number;
  unit?: string;
  basePrice?: string;
  listImage?: string;
  salesFrom: string;
  salesTo: string;
}

const clean = (s?: string) =>
  // \s also matches the U+2028 line separators Kaufland puts in titles.
  (s ?? "").replace(/&#x2028;/g, " ").replace(/\s+/g, " ").trim();

export function parseKaufland(html: string, today: string = berlinDate()): Offer[] {
  const ssr = [...html.matchAll(/window\.SSR\['[^']+'\]\s*=\s*(\{.*?\})\s*;?\s*<\/script>/gs)]
    .map((m) => m[1])
    .find((json) => json.includes('"offerData"'));
  if (!ssr) throw new Error("kaufland: offer data not found — page structure changed");

  const cycles: Array<{ categories: Array<{ offers: KauflandOffer[] }> }> =
    JSON.parse(ssr).props.offerData.cycles;

  // The same article is listed under several themed sections.
  const byId = new Map<string, Offer>();
  for (const cycle of cycles) {
    for (const category of cycle.categories) {
      for (const o of category.offers) {
        if (!o.price || byId.has(o.offerId)) continue;
        // Skips next week's preview and "from Thursday" offers that have not started.
        if (today < o.salesFrom || today > o.salesTo) continue;
        byId.set(o.offerId, {
          name: clean(`${o.title ?? ""} ${o.subtitle ?? ""}`),
          description: clean(o.detailDescription),
          price: o.price,
          unitText: clean(o.unit),
          baseText: clean(o.basePrice) || undefined,
          imageUrl: o.listImage,
          url: OFFERS_URL,
          validUntil: o.salesTo,
        });
      }
    }
  }
  return [...byId.values()];
}

export class KauflandSource implements StoreSource {
  readonly storeSlug = "kaufland";
  async fetchOffers(): Promise<Offer[]> {
    return parseKaufland(await fetchText(OFFERS_URL));
  }
}
