/**
 * Kaufland — weekly in-store offers from filiale.kaufland.de
 *
 * The page embeds every offer as structured JSON (window.SSR[...]): price,
 * pack size, base price, sales window, image. No browser needed.
 */
import type { Offer, StoreSource } from "../types.js";
import { fetchText, berlinDate } from "../http.js";

const BASE = "https://filiale.kaufland.de";
const OFFERS_URL = `${BASE}/angebote/uebersicht.html`;

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

/** Kaufland's Berlin branches from its store finder ("n" = store id, "t" = town). */
export function berlinStoreIds(stores: Array<{ n?: string; t?: string }>): string[] {
  return stores.filter((s) => s.t?.trim().toLowerCase() === "berlin" && s.n).map((s) => s.n!);
}

/**
 * One list for all of Berlin: every offer any Berlin branch has, once. Where
 * branches disagree on a price, the price most of them charge wins.
 */
export function mergeBranches(perBranch: Offer[][]): Offer[] {
  const groups = new Map<string, Offer[]>();
  for (const offers of perBranch) {
    for (const o of offers) {
      const key = `${o.name}|${o.unitText}`;
      groups.set(key, [...(groups.get(key) ?? []), o]);
    }
  }
  return [...groups.values()].map((list) => {
    const byPrice = new Map<number, Offer[]>();
    for (const o of list) byPrice.set(o.price, [...(byPrice.get(o.price) ?? []), o]);
    return [...byPrice.values()].sort((a, b) => b.length - a.length || a[0].price - b[0].price)[0][0];
  });
}

export class KauflandSource implements StoreSource {
  readonly storeSlug = "kaufland";
  async fetchOffers(): Promise<Offer[]> {
    // The default page is not Berlin's: a Berlin branch has ~50 offers it lacks.
    const ids = berlinStoreIds(JSON.parse(await fetchText(`${BASE}/.klstorefinder.json`)));
    if (ids.length === 0) throw new Error("kaufland: no Berlin branch in the store finder — page structure changed");
    const perBranch: Offer[][] = [];
    for (let i = 0; i < ids.length; i += 4) {
      const pages = await Promise.all(
        ids.slice(i, i + 4).map((id) => fetchText(`${BASE}/angebote/uebersicht.storeName=${encodeURIComponent(id)}.html`)),
      );
      for (const html of pages) {
        try {
          perBranch.push(parseKaufland(html));
        } catch {
          // A branch without a flyer this week (seen: DE8940) — skip it.
        }
      }
    }
    // Most branches unreadable means the page changed, not a few odd branches.
    if (perBranch.length < ids.length / 2) {
      throw new Error(`kaufland: only ${perBranch.length} of ${ids.length} Berlin branches readable — page structure changed`);
    }
    return mergeBranches(perBranch);
  }
}
