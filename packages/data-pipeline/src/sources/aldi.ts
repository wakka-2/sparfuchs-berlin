/**
 * Aldi Nord — weekly offers from aldi-nord.de/angebote.html plus the full
 * everyday range (with shelf prices) from aldi-nord.de/sortiment.
 *
 * The page is server-rendered Next.js: every offer is embedded as structured
 * JSON (price, base price, pack size, validity window, image), so no browser
 * and no text parsing is needed.
 */
import type { Offer, StoreSource } from "../types.js";
import { fetchText, berlinDate } from "../http.js";

const OFFERS_URL = "https://www.aldi-nord.de/angebote.html";

interface AldiProduct {
  objectID?: string;
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

const DAY = 86_400;

function nextData(html: string) {
  const next = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!next) throw new Error("aldi-nord: __NEXT_DATA__ not found — page structure changed");
  return JSON.parse(next[1]).props.pageProps as {
    apiData?: string;
    algoliaState?: { initialResults: Record<string, { results: Array<{ hits: AldiProduct[] }> }> };
  };
}

// apiData is a JSON string of [callName, { req, res }] pairs.
type ApiCall = [string, { res?: unknown }];
const apiCalls = (props: ReturnType<typeof nextData>): ApiCall[] =>
  props.apiData ? JSON.parse(props.apiData) : [];

/**
 * One Aldi product → Offer, or null when it is not on sale today.
 * A price window longer than 60 days is the everyday shelf price; it is given
 * a validUntil of tomorrow so it drops off the site if the daily run stops.
 */
function toOffer(p: AldiProduct, nowSec: number): Offer | null {
  const cp = p.currentPrice;
  if (!cp?.priceValue || !cp.validFrom || !cp.validUntil) return null;
  if (nowSec < cp.validFrom || nowSec > cp.validUntil) return null;
  const regular = cp.validUntil - cp.validFrom > 60 * DAY;

  // Several base prices mean several pack sizes — quote the dearest.
  const base = cp.basePrice?.length
    ? cp.basePrice.reduce((a, b) => (b.basePriceValue > a.basePriceValue ? b : a))
    : null;

  return {
    name: [p.brandName, p.name].filter(Boolean).join(" "),
    description: p.shortDescription,
    price: cp.priceValue,
    unitText: p.salesUnit ?? "",
    baseText: base
      ? `${/^\d/.test(base.basePriceScale) ? "" : "1 "}${base.basePriceScale} = ${base.basePriceValue.toFixed(2)}`
      : undefined,
    imageUrl: p.assets?.find((a) => a.type === "primary")?.url,
    url: p.productSlug ? `https://www.aldi-nord.de/produkt/${p.productSlug}.html` : OFFERS_URL,
    validUntil: berlinDate(new Date((regular ? nowSec + DAY : cp.validUntil) * 1000)),
    regular,
  };
}

/** Weekly offers from the Angebote page (the page also previews next week). */
export function parseAldi(html: string, now: Date = new Date()): Offer[] {
  const products = apiCalls(nextData(html)).flatMap(([, call]) =>
    Object.values((call.res as { algoliaDataMap?: Record<string, AldiProduct> } | undefined)?.algoliaDataMap ?? {}),
  );
  const nowSec = now.getTime() / 1000;
  return products.flatMap((p) => toOffer(p, nowSec) ?? []);
}

/** A Sortiment category page: its products and the paths of its subcategories. */
export function parseAldiCategory(html: string, now: Date = new Date()) {
  const props = nextData(html);
  const nowSec = now.getTime() / 1000;
  const products = Object.values(props.algoliaState?.initialResults ?? {})
    .flatMap((r) => r.results.flatMap((res) => res.hits))
    .map((p) => ({ id: p.objectID ?? p.productSlug ?? p.name, offer: toOffer(p, nowSec) }));
  const children = apiCalls(props)
    .filter(([name]) => name === "PRODUCT_MGNL_CATEGORY_CHILDREN_GET")
    .flatMap(([, call]) => (Array.isArray(call.res) ? call.res : []))
    .map((c: { reference?: { path?: string } }) => c.reference?.path)
    .filter((path): path is string => !!path && !SKIP_CATEGORIES.test(path));
  return { products, children };
}

// Non-grocery or overlapping collections (every product is also in a real category).
const SKIP_CATEGORIES = /gutscheine|sortiment-highlights|eigenmarken|bio-produkte|vegane-produkte/;

/** Walk the whole Sortiment tree from /sortiment.html; every product once. */
async function fetchCatalog(): Promise<Offer[]> {
  const seen = new Map<string, Offer | null>();
  const queue = ["/sortiment"];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const batch = queue.splice(0, 6).filter((p) => !visited.has(p));
    batch.forEach((p) => visited.add(p));
    const pages = await Promise.all(batch.map((p) => fetchText(`https://www.aldi-nord.de${p}.html`)));
    for (const html of pages) {
      const { products, children } = parseAldiCategory(html);
      for (const { id, offer } of products) if (!seen.has(id)) seen.set(id, offer);
      queue.push(...children);
    }
  }
  // A whole-catalog crawl that finds almost nothing means the page changed.
  if (seen.size < 500) throw new Error(`aldi-nord: only ${seen.size} catalog products — page structure changed`);
  return [...seen.values()].filter((o): o is Offer => o !== null);
}

export class AldiNordSource implements StoreSource {
  readonly storeSlug = "aldi-nord";
  async fetchOffers(): Promise<Offer[]> {
    const offers = parseAldi(await fetchText(OFFERS_URL));
    return [...offers, ...(await fetchCatalog())];
  }
}
