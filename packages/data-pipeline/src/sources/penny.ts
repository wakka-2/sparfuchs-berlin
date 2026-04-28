/**
 * Penny scraper — scrapes weekly offers from penny.de/angebote
 *
 * Flow:
 * 1. Load the offers page, accept cookies
 * 2. Scroll to load all lazy-rendered offer tiles
 * 3. Parse each .offer-tile for name / price / image
 * 4. For fetchAll(): fuzzy-match offer names to catalog products
 *
 * Price format: "1.99*" or "2.29" (dot notation, * = App price suffix)
 * Tile text order: [Nur mit App, app_price*,] [UVP X.XX,] sale_price, [-XX%,]
 *                  PRODUCT NAME, unit info
 */
import type { RawProductData, StoreSource } from "../types.js";
import { newPage } from "../browser.js";

const OFFERS_URL = "https://www.penny.de/angebote";
const SEARCH_BASE = "https://www.penny.de/suche?query=";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

interface ScrapedOffer {
  name: string;
  price: number;
  unitSize: string;
  imageUrl: string | undefined;
}

async function acceptCookies(page: import("playwright").Page) {
  try {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button")];
      const accept = btns.find((b) =>
        /akzeptieren|zustimmen|alle.*cookie|accept/i.test(b.textContent ?? ""),
      );
      if (accept) (accept as HTMLElement).click();
    });
    await sleep(1000);
  } catch {
    // banner not present
  }
}

/**
 * Parse a single Penny offer tile.
 *
 * Text examples:
 *   "Nur mit App\n1.99*\nUVP 3.99\n2.29\n-50%\n-42%\nMEGGLE Streichzart*\nje 400 g (1 kg = 4.98)"
 *   "UVP 3.99\n1.79\n-55%\nSALAKIS Natur\nje 180 g (1 kg = 9.94)"
 *   "UVP 1.49\n0.69\n-55%\nPEPSI...\nje 1,25 l (1 l = 0.55)"
 *
 * The regular sale price is the first price NOT preceded by "Nur mit App" and
 * NOT prefixed by "UVP". App prices end with *.
 */
function parseTileText(text: string, imgSrc: string): ScrapedOffer | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const priceRe = /^(\d+)\.(\d{2})\*?$/; // "2.29" or "1.99*"
  const uvpRe = /^UVP\s/i;
  const pctRe = /^-\d+%$/;
  const appRe = /^Nur mit App$/i;

  let skipNextPrice = false; // true while consuming an App-only price
  let price: number | null = null;
  const nonPriceLines: string[] = [];

  for (const line of lines) {
    if (appRe.test(line)) {
      skipNextPrice = true;
      continue;
    }
    if (uvpRe.test(line)) continue;
    if (pctRe.test(line)) continue;

    const m = line.match(priceRe);
    if (m) {
      if (skipNextPrice) {
        skipNextPrice = false; // consume the App price, skip it
        continue;
      }
      if (price === null) {
        price = parseFloat(`${m[1]}.${m[2]}`);
      }
      continue;
    }

    nonPriceLines.push(line);
  }

  if (price === null || price <= 0) return null;

  const name = nonPriceLines[0] ?? "";
  if (!name) return null;

  const unitSize = nonPriceLines[1] ?? "";

  return {
    name,
    price,
    unitSize,
    imageUrl: imgSrc || undefined,
  };
}

async function scrapeAllOffers(
  page: import("playwright").Page,
): Promise<ScrapedOffer[]> {
  await page.goto(OFFERS_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
  await sleep(2000);
  await acceptCookies(page);
  await sleep(1000);

  // Scroll to trigger lazy-loading
  const scrollSteps = 8;
  for (let i = 1; i <= scrollSteps; i++) {
    const fraction = i / scrollSteps;
    await page.evaluate((f: number) => {
      window.scrollTo(0, document.body.scrollHeight * f);
    }, fraction);
    await sleep(400);
  }
  await sleep(1500);

  const rawTiles = await page.evaluate(() => {
    const tiles = document.querySelectorAll<HTMLElement>(".offer-tile");
    return Array.from(tiles).map((tile) => {
      const img = tile.querySelector<HTMLImageElement>("img");
      return {
        text: tile.innerText ?? "",
        imgSrc: img?.src ?? img?.dataset?.src ?? "",
      };
    });
  });

  const results: ScrapedOffer[] = [];
  for (const { text, imgSrc } of rawTiles) {
    const parsed = parseTileText(text, imgSrc);
    if (parsed) results.push(parsed);
  }
  return results;
}

function nameSimilarity(a: string, b: string): number {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const wa = new Set(normalise(a));
  const wb = normalise(b);
  if (wa.size === 0 || wb.length === 0) return 0;
  let matches = 0;
  for (const w of wb) if (wa.has(w)) matches++;
  return matches / Math.max(wa.size, wb.length);
}

function bestMatch(productName: string, offers: ScrapedOffer[]): ScrapedOffer | null {
  let best: ScrapedOffer | null = null;
  let bestScore = 0.15;
  for (const offer of offers) {
    const score = nameSimilarity(productName, offer.name);
    if (score > bestScore) {
      bestScore = score;
      best = offer;
    }
  }
  return best;
}

/**
 * Search Penny's product catalog for products not in this week's offers.
 * penny.de/suche uses the same .offer-tile component as the offers page.
 */
async function searchCatalog(
  page: import("playwright").Page,
  productName: string,
): Promise<ScrapedOffer | null> {
  const url = `${SEARCH_BASE}${encodeURIComponent(productName)}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(1500);
    await acceptCookies(page);

    const rawItems = await page.evaluate(() => {
      const tiles = document.querySelectorAll<HTMLElement>(".offer-tile");
      return Array.from(tiles).slice(0, 8).map((tile) => {
        const img = tile.querySelector<HTMLImageElement>("img");
        return { text: tile.innerText ?? "", imgSrc: img?.src ?? img?.dataset?.src ?? "" };
      });
    });

    let best: ScrapedOffer | null = null;
    let bestScore = 0.1;
    for (const { text, imgSrc } of rawItems) {
      const parsed = parseTileText(text, imgSrc);
      if (!parsed) continue;
      const score = nameSimilarity(productName, parsed.name);
      if (score > bestScore) {
        bestScore = score;
        best = parsed;
      }
    }

    if (best) {
      console.log(`[penny] "${productName}" → catalog "${best.name}" @ ${best.price} €`);
    }
    return best;
  } catch (err) {
    console.warn(
      `[penny] catalog search failed for "${productName}": ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export class PennySource implements StoreSource {
  readonly storeSlug = "penny";

  private offersCache: ScrapedOffer[] | null = null;

  private async getOffers(page: import("playwright").Page): Promise<ScrapedOffer[]> {
    if (this.offersCache) return this.offersCache;
    console.log("[penny] Scraping weekly offers page...");
    const offers = await scrapeAllOffers(page);
    console.log(`[penny] Found ${offers.length} offer tiles`);
    this.offersCache = offers;
    return offers;
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
        console.log(`[penny] "${productName}" → offer "${match.name}" @ ${match.price} €`);
        return {
          externalId: "",
          name: match.name,
          price: match.price,
          currency: "EUR",
          unitSize: match.unitSize,
          imageUrl: match.imageUrl,
          url: OFFERS_URL,
          isEstimated: false,
        };
      }

      // Not on offer — search catalog for regular price
      const catalog = await searchCatalog(page, productName);
      if (catalog) {
        return {
          externalId: "",
          name: catalog.name,
          price: catalog.price,
          currency: "EUR",
          unitSize: catalog.unitSize,
          imageUrl: catalog.imageUrl,
          url: `${SEARCH_BASE}${encodeURIComponent(productName)}`,
          isEstimated: false,
        };
      }

      console.warn(`[penny] No price found for "${productName}"`);
      return null;
    } catch (err) {
      console.error(`[penny] Error: ${err instanceof Error ? err.message : String(err)}`);
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
          console.log(`[penny] "${product.productName}" → "${match.name}" @ ${match.price} €`);
          results.push({
            externalId: "",
            name: match.name,
            price: match.price,
            currency: "EUR",
            unitSize: match.unitSize,
            imageUrl: match.imageUrl,
            url: OFFERS_URL,
            isEstimated: false,
          });
        } else {
          const catalog = await searchCatalog(page, product.productName);
          if (catalog) {
            results.push({
              externalId: "",
              name: catalog.name,
              price: catalog.price,
              currency: "EUR",
              unitSize: catalog.unitSize,
              imageUrl: catalog.imageUrl,
              url: `${SEARCH_BASE}${encodeURIComponent(product.productName)}`,
              isEstimated: false,
            });
          } else {
            console.warn(`[penny] No price found for "${product.productName}"`);
          }
        }
      }
      return results;
    } finally {
      await page.context().close();
    }
  }
}
