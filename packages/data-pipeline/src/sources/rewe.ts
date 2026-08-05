/**
 * REWE scraper — scrapes weekly grocery offers from rewe.de/angebote/nationale-angebote/
 *
 * The REWE delivery shop (shop.rewe.de) blocks headless browsers with a WAF.
 * The weekly offers page (www.rewe.de) is accessible and contains grocery items
 * with real sale prices, product images, and unit info.
 *
 * Flow:
 * 1. Load the national offers page, accept cookies via shadow DOM
 * 2. Scroll to load all lazy-rendered offer tiles
 * 3. Parse each .cor-offer-renderer-tile for name / price / image
 * 4. For fetchAll(): fuzzy-match offer names to the catalog product list
 * 5. Return matched RawProductData records
 */
import type { RawProductData, StoreSource } from "../types.js";
import { newPage, gotoWithRetry } from "../browser.js";
import { bestMatch } from "../matching.js";

const OFFERS_URL = "https://www.rewe.de/angebote/nationale-angebote/";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

interface ScrapedOffer {
  name: string;
  price: number;
  unitSize: string;
  imageUrl: string | undefined;
  url: string | undefined;
}

async function acceptCookies(page: import("playwright").Page) {
  try {
    // Usercentrics consent banner lives in a shadow DOM
    await page.evaluate(() => {
      const root = document.querySelector("#usercentrics-root");
      if (!root || !root.shadowRoot) return;
      const btn = root.shadowRoot.querySelector<HTMLElement>(
        'button[data-testid="uc-accept-all-button"]',
      );
      if (btn) btn.click();
    });
    await sleep(1000);
  } catch {
    // banner not present or already dismissed
  }
}

/**
 * Parse a single offer tile's innerText into structured data.
 * Text format (examples):
 *   "0,20 €\nBarilla Pesto Rosso\nje 200-g-Glas, (1 kg = 9,95 €)\nAktion\n1,99 €"
 *   "Beck's\nversch. Sorten, je 6 x 0,33-l-Fl.\nAktion\n3,99 €"
 * The loyalty badge (first small price like "0,10 €") is NOT the product price.
 * The last X,XX € in the text is the actual sale price.
 */
function parseTileText(text: string, imgSrc: string, href: string): ScrapedOffer | null {
  const priceRe = /(\d+),(\d{2})\s*€/g;
  const allPrices = [...text.matchAll(priceRe)].map((m) =>
    parseFloat(`${m[1]}.${m[2]}`),
  );

  if (allPrices.length === 0) return null;

  // The actual sale price is the last price in the text.
  // Loyalty badge (if present) is the first and is always < 1 €.
  const price = allPrices[allPrices.length - 1];
  if (price <= 0) return null;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Skip lines that are just a price or "Aktion" or very short
  const priceLine = /^\d+,\d{2}\s*€$/;
  const nameLines = lines.filter(
    (l) => !priceLine.test(l) && l !== "Aktion" && l !== "REWE Bonus Logo" && l.length > 2,
  );

  const name = nameLines[0] ?? "";
  if (!name) return null;

  // Unit info is the second meaningful non-price line
  const unitSize = nameLines[1] ?? "";

  return {
    name,
    price,
    unitSize,
    imageUrl: imgSrc || undefined,
    url: href || undefined,
  };
}

/**
 * Category sub-pages of the national offers page.
 *
 * The landing page lazy-renders only part of the weekly offers, so scraping it
 * alone misses roughly a fifth of them (measured: 79 products from the landing
 * page vs 101 across landing + categories, with staples such as
 * Speisekartoffeln and Bio Bananen only present on a category page).
 */
const OFFER_CATEGORIES = [
  "topangebote",
  "rewe-bonus-produkte",
  "thema-der-woche",
  "obst-und-gemuese",
  "kuehlung",
  "schnell-und-einfach",
  "tiefkuehl",
  "getraenke",
  "haushalt",
  "drogerie",
  "suesses-und-salziges",
];

/** Scrape one offers page (landing or category) into parsed offers. */
async function scrapeOffersPage(
  page: import("playwright").Page,
  url: string,
): Promise<ScrapedOffer[]> {
  await gotoWithRetry(page, url, { timeout: 25000 });
  await sleep(2000);
  await acceptCookies(page);
  await sleep(1500);

  // Scroll to trigger lazy-loading of all tile images/content
  const scrollSteps = 8;
  for (let i = 1; i <= scrollSteps; i++) {
    const fraction = i / scrollSteps;
    await page.evaluate((f: number) => {
      window.scrollTo(0, document.body.scrollHeight * f);
    }, fraction);
    await sleep(400);
  }
  await sleep(1500);

  // Extract all offer tiles from the DOM
  const offers = await page.evaluate(() => {
    const tiles = document.querySelectorAll<HTMLElement>(
      ".cor-offer-renderer-tile",
    );
    return Array.from(tiles).map((tile) => {
      const img = tile.querySelector<HTMLImageElement>(
        'img[src*="img.rewe-static"]',
      );
      const link = tile.closest<HTMLAnchorElement>("a") ?? tile.querySelector<HTMLAnchorElement>("a");
      return {
        text: tile.innerText ?? "",
        imgSrc: img?.src ?? img?.dataset?.src ?? "",
        href: link?.href ?? "",
      };
    });
  });

  const results: ScrapedOffer[] = [];
  for (const { text, imgSrc, href } of offers) {
    const parsed = parseTileText(text, imgSrc, href);
    if (parsed) results.push(parsed);
  }

  return results;
}

/**
 * Load the weekly offers from the landing page plus every category sub-page,
 * de-duplicated by product name. A failing category is skipped rather than
 * aborting the run — partial coverage beats none.
 */
async function scrapeAllOffers(
  page: import("playwright").Page,
): Promise<ScrapedOffer[]> {
  const byName = new Map<string, ScrapedOffer>();

  const landing = await scrapeOffersPage(page, OFFERS_URL);
  for (const offer of landing) byName.set(offer.name, offer);
  console.log(`[rewe] Landing page: ${landing.length} tiles`);

  for (const category of OFFER_CATEGORIES) {
    try {
      const offers = await scrapeOffersPage(page, `${OFFERS_URL}${category}/`);
      let added = 0;
      for (const offer of offers) {
        if (!byName.has(offer.name)) {
          byName.set(offer.name, offer);
          added++;
        }
      }
      console.log(`[rewe]   ${category}: ${offers.length} tiles (+${added} new)`);
    } catch (err) {
      console.warn(
        `[rewe]   ${category}: skipped — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return [...byName.values()];
}


export class ReweSource implements StoreSource {
  readonly storeSlug = "rewe";

  /** Cached offer list for the current pipeline run. */
  private offersCache: ScrapedOffer[] | null = null;

  private async getOffers(
    page: import("playwright").Page,
  ): Promise<ScrapedOffer[]> {
    if (this.offersCache) return this.offersCache;
    console.log("[rewe] Scraping weekly offers page...");
    try {
      const offers = await scrapeAllOffers(page);
      console.log(`[rewe] Found ${offers.length} offer tiles`);
      this.offersCache = offers;
      return offers;
    } catch (err) {
      // A failing offers page must not abort the whole store — the other
      // stores' results are still worth committing. Cache the empty result so
      // we don't re-attempt (and re-fail) the page once per product.
      console.warn(
        `[rewe] Offers page unavailable: ${err instanceof Error ? err.message : String(err)} — no prices for this store`,
      );
      this.offersCache = [];
      return [];
    }
  }

  async fetchProduct(
    _externalId: string,
    productName: string,
  ): Promise<RawProductData | null> {
    const page = await newPage();
    try {
      const offers = await this.getOffers(page);
      const match = bestMatch(productName, offers);
      if (match) {
        console.log(`[rewe] "${productName}" → offer "${match.name}" @ ${match.price} €`);
        return {
          externalId: "",
          name: match.name,
          price: match.price,
          currency: "EUR",
          unitSize: match.unitSize,
          imageUrl: match.imageUrl,
          url: match.url,
          isEstimated: false,
        };
      }

      // No catalog-search fallback: rewe.de/suche renders product tiles with
      // no prices at all (prices live on shop.rewe.de, which blocks headless
      // browsers), so the lookup could never return a price — it only cost
      // ~5s per product and pushed the pipeline past its timeout.
      console.warn(`[rewe] Not on offer this week: "${productName}"`);
      return null;
    } catch (err) {
      console.error(
        `[rewe] Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    } finally {
      await page.context().close();
    }
  }

  async fetchAll(
    products: Array<{ externalProductId: string | null; productName: string }>,
  ): Promise<RawProductData[]> {
    const page = await newPage();
    try {
      const offers = await this.getOffers(page);

      const results: RawProductData[] = [];
      for (const product of products) {
        const match = bestMatch(product.productName, offers);
        if (match) {
          console.log(
            `[rewe] "${product.productName}" → "${match.name}" @ ${match.price} €`,
          );
          results.push({
            externalId: "",
            name: match.name,
            price: match.price,
            currency: "EUR",
            unitSize: match.unitSize,
            imageUrl: match.imageUrl,
            url: match.url,
            isEstimated: false,
          });
        } else {
          // Not in this week's offers means no price: rewe.de/suche renders
          // tiles without any prices, so there is nowhere else to look.
          console.warn(`[rewe] Not on offer this week: "${product.productName}"`);
        }
      }
      return results;
    } finally {
      await page.context().close();
    }
  }
}
