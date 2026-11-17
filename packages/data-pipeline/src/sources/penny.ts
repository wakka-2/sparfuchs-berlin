/**
 * Penny — weekly offers from penny.de
 *
 * The offers page is a shell; the tiles come from a JSON endpoint per flyer
 * section (/.rest/offers/by-category/<year>-<week>/<section>). We read the
 * section list from the page and then fetch the JSON directly.
 */
import type { Offer, StoreSource } from "../types.js";
import { fetchText, berlinDate, saturdayOf } from "../http.js";

const BASE = "https://www.penny.de";
const OFFERS_URL = `${BASE}/angebote`;

interface PennyTile {
  primaryType?: string;
  title?: string;
  quantity?: string;
  price?: string;
  basePrice?: string;
  detailLinkHref?: string;
  imageRendition?: { tileMd?: string };
}

/** Sections are prefixed with the weekday they start on: "ab-donnerstag--getraenke1". */
const START_DAY: Record<string, number> = {
  montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
};

/** Section slugs of the current week that have already started. */
export function parsePennySections(html: string, today: string): string[] {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  const sections = new Set<string>();
  for (const [tag] of html.matchAll(/<button[^>]*data-category-id="[^"]+"[^>]*>/g)) {
    if (!tag.includes('data-week="current"')) continue;
    const id = tag.match(/data-category-id="ab-([a-z]+)--([^"]+)"/);
    if (id && (START_DAY[id[1]] ?? 1) <= weekday) sections.add(id[2]);
  }
  return [...sections];
}

export function parsePennyTiles(tiles: PennyTile[], validUntil: string): Offer[] {
  const offers: Offer[] = [];
  for (const t of tiles) {
    // Only plain offers: "promo" tiles carry app-only and multi-buy prices
    // ("1.79²"), which are not the price everyone pays at the till.
    if (t.primaryType !== "offer" || !t.title || !/^\d+\.\d{2}$/.test(t.price ?? "")) continue;
    if (/app/i.test(`${t.quantity} ${t.basePrice}`)) continue;
    offers.push({
      name: t.title.replace(/[­*]/g, "").trim(),
      price: parseFloat(t.price!),
      unitText: t.quantity ?? "",
      baseText: t.basePrice || undefined,
      imageUrl: t.imageRendition?.tileMd,
      url: t.detailLinkHref ? BASE + t.detailLinkHref.split("~")[0] : OFFERS_URL,
      validUntil,
    });
  }
  return offers;
}

/** ISO-8601 week as Penny writes it: "2026-47". */
export function isoWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export class PennySource implements StoreSource {
  readonly storeSlug = "penny";

  async fetchOffers(): Promise<Offer[]> {
    const today = berlinDate();
    const sections = parsePennySections(await fetchText(OFFERS_URL), today);
    if (sections.length === 0) throw new Error("penny: no flyer sections found — page structure changed");

    const week = isoWeek(today);
    const byName = new Map<string, Offer>();
    for (const section of sections) {
      const json = await fetchText(`${BASE}/.rest/offers/by-category/${week}/${section}`);
      const tiles: PennyTile[] = JSON.parse(json).offerTiles ?? [];
      for (const offer of parsePennyTiles(tiles, saturdayOf(today))) {
        byName.set(`${offer.name}|${offer.unitText}`, offer);
      }
    }
    return [...byName.values()];
  }
}
