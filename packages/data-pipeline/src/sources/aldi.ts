/**
 * Aldi Nord — weekly offers from aldi-nord.de/angebote.html
 *
 * The page is server-rendered Next.js: every offer is embedded as structured
 * JSON (price, base price, pack size, validity window, image), so no browser
 * and no text parsing is needed.
 */
import type { Offer, StoreSource } from "../types.js";
import { fetchText, berlinDate } from "../http.js";

const OFFERS_URL = "https://www.aldi-nord.de/angebote.html";

interface AldiProduct {
  name: string;
  brandName?: string;
  shortDescription?: string;
  salesUnit?: string;
  productSlug?: string;
  currentPrice?: {
    priceValue?: number;
    validFrom?: number;
    validUntil?: number;
    basePrice?: Array<{ basePriceValue: number; basePriceScale: string }>;
  };
  assets?: Array<{ type: string; url: string }>;
}

export function parseAldi(html: string, now: Date = new Date()): Offer[] {
  const next = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!next) throw new Error("aldi-nord: __NEXT_DATA__ not found — page structure changed");

  // apiData is a JSON string of [callName, { req, res }] pairs.
  const apiData: Array<[string, { res?: { algoliaDataMap?: Record<string, AldiProduct> } }]> =
    JSON.parse(JSON.parse(next[1]).props.pageProps.apiData);
  const products = apiData.flatMap(([, call]) => Object.values(call.res?.algoliaDataMap ?? {}));

  const nowSec = now.getTime() / 1000;
  const offers: Offer[] = [];
  for (const p of products) {
    const cp = p.currentPrice;
    if (!cp?.priceValue || !cp.validFrom || !cp.validUntil) continue;
    // The page also lists next week's offers — only keep what is valid now.
    if (nowSec < cp.validFrom || nowSec > cp.validUntil) continue;

    // Several base prices mean several pack sizes — quote the dearest.
    const base = cp.basePrice?.length
      ? cp.basePrice.reduce((a, b) => (b.basePriceValue > a.basePriceValue ? b : a))
      : null;

    offers.push({
      name: [p.brandName, p.name].filter(Boolean).join(" "),
      description: p.shortDescription,
      price: cp.priceValue,
      unitText: p.salesUnit ?? "",
      baseText: base
        ? `${/^\d/.test(base.basePriceScale) ? "" : "1 "}${base.basePriceScale} = ${base.basePriceValue.toFixed(2)}`
        : undefined,
      imageUrl: p.assets?.find((a) => a.type === "primary")?.url,
      url: p.productSlug ? `https://www.aldi-nord.de/produkt/${p.productSlug}.html` : OFFERS_URL,
      validUntil: berlinDate(new Date(cp.validUntil * 1000)),
    });
  }
  return offers;
}

export class AldiNordSource implements StoreSource {
  readonly storeSlug = "aldi-nord";
  async fetchOffers(): Promise<Offer[]> {
    return parseAldi(await fetchText(OFFERS_URL));
  }
}
