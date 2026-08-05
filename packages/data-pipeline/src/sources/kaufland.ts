/**
 * Kaufland scraper — weekly in-store offers.
 *
 * Source: filiale.kaufland.de/angebote/uebersicht.html (.k-product-tile)
 *
 * Offer tiles usually carry a "-XX%" discount badge; parseTile() also handles
 * badge-less tiles, taking the first price as the regular shelf price.
 *
 * Products not in this week's offers get no price. Kaufland publishes no
 * usable regular-price source: the old product-search URL 404s, and the
 * current one is behind a Cloudflare challenge and returns marketplace
 * listings rather than grocery shelf prices.
 */
import type { RawProductData, StoreSource } from "../types.js";
import { newPage, gotoWithRetry } from "../browser.js";
import { bestMatch } from "../matching.js";

const OFFERS_URL = "https://filiale.kaufland.de/angebote/uebersicht.html";

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
    await sleep(800);
  } catch {
    // banner not present
  }
}

/**
 * Parse a single Kaufland product tile.
 *
 * Sale tile:     "-XX%\nsale_price\noriginal_price"  → take sale_price
 * Regular tile:  no badge → take the first X.XX price found
 *
 * Prices use dot notation (1.79, not 1,79).
 * Product name comes from img alt attribute.
 */
function parseTile(text: string, imgAlt: string, imgSrc: string): ScrapedOffer | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const priceRe = /^(\d+)\.(\d{2})$/;
  const pctRe = /^-\d+%$/;

  let price: number | null = null;
  let unitSize = "";

  // Strategy 1: discount badge present → next line is sale price
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!unitSize && /^je\s|[-–]\d+[-–](g|ml|l|kg|cl)[-–]/i.test(line)) {
      unitSize = line;
    }
    if (pctRe.test(line) && price === null) {
      const next = lines[i + 1];
      if (next) {
        const m = next.match(priceRe);
        if (m) price = parseFloat(`${m[1]}.${m[2]}`);
      }
    }
  }

  // Strategy 2: no discount badge → take the first X.XX number (regular shelf price)
  if (price === null) {
    for (const line of lines) {
      if (!unitSize && /^je\s|[-–]\d+[-–](g|ml|l|kg|cl)[-–]/i.test(line)) {
        unitSize = line;
      }
      const m = line.match(priceRe);
      if (m) {
        price = parseFloat(`${m[1]}.${m[2]}`);
        break;
      }
    }
  }

  if (price === null || price <= 0) return null;

  // Skip price/badge/unit lines when imgAlt is missing so we don't get "-25% 1.79" as the name
  const nameSkipRe = /^(-\d+%|\d+[.,]\d{2}|je\s|\d+\s*(g|ml|l|kg|cl)\b)/i;
  const textLines = lines.filter((l) => !nameSkipRe.test(l));
  const name = imgAlt.trim() || textLines[0] || "";
  if (!name) return null;

  return { name, price, unitSize, imageUrl: imgSrc || undefined };
}

async function extractTiles(
  page: import("playwright").Page,
): Promise<Array<{ text: string; imgAlt: string; imgSrc: string }>> {
  return page.evaluate(() => {
    // Try multiple selector patterns — kaufland.de and filiale.kaufland.de may differ
    const selectors = [".k-product-tile", ".product-tile", "[class*='product-tile']"];
    let tiles: NodeListOf<HTMLElement> | null = null;
    for (const sel of selectors) {
      const found = document.querySelectorAll<HTMLElement>(sel);
      if (found.length > 0) { tiles = found; break; }
    }
    if (!tiles) return [];
    return Array.from(tiles).map((tile) => {
      const img = [...tile.querySelectorAll<HTMLImageElement>("img")].find(
        (i) => i.src && !i.src.includes(".svg") && !i.src.startsWith("data:"),
      );
      return {
        text: tile.innerText ?? "",
        imgAlt: img?.alt ?? "",
        imgSrc: img?.src ?? "",
      };
    });
  });
}

async function scrapeAllOffers(page: import("playwright").Page): Promise<ScrapedOffer[]> {
  await gotoWithRetry(page, OFFERS_URL, { timeout: 30000 });
  await sleep(3000);
  await acceptCookies(page);
  await sleep(1000);

  const scrollSteps = 12;
  for (let i = 1; i <= scrollSteps; i++) {
    await page.evaluate((f: number) => {
      window.scrollTo(0, document.body.scrollHeight * f);
    }, i / scrollSteps);
    await sleep(400);
  }
  await sleep(2500);

  const rawTiles = await extractTiles(page);
  const results: ScrapedOffer[] = [];
  for (const { text, imgAlt, imgSrc } of rawTiles) {
    const parsed = parseTile(text, imgAlt, imgSrc);
    if (parsed) results.push(parsed);
  }
  return results;
}



export class KauflandSource implements StoreSource {
  readonly storeSlug = "kaufland";

  private offersCache: ScrapedOffer[] | null = null;

  private async getOffers(page: import("playwright").Page): Promise<ScrapedOffer[]> {
    if (this.offersCache) return this.offersCache;
    console.log("[kaufland] Scraping weekly offers page...");
    try {
      const offers = await scrapeAllOffers(page);
      console.log(`[kaufland] Found ${offers.length} offer tiles`);
      this.offersCache = offers;
      return offers;
    } catch (err) {
      // A failing offers page must not abort the whole store — the other
      // stores' results are still worth committing. Cache the empty result so
      // we don't re-attempt (and re-fail) the page once per product.
      console.warn(
        `[kaufland] Offers page unavailable: ${err instanceof Error ? err.message : String(err)} — no prices for this store`,
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
        console.log(`[kaufland] "${productName}" → offer "${match.name}" @ ${match.price} €`);
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

      // No catalog-search fallback: the product-search URL returns HTTP 404,
      // and the current one (kaufland.de/s/) is behind a Cloudflare challenge
      // and serves marketplace listings rather than grocery shelf prices —
      // "Eier" there returns egg cookers and egg cups. This lookup was the
      // single biggest cost in the pipeline (~25s per product).
      console.warn(`[kaufland] Not on offer this week: "${productName}"`);
      return null;
    } catch (err) {
      console.error(`[kaufland] Error: ${err instanceof Error ? err.message : String(err)}`);
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
            `[kaufland] "${product.productName}" → offer "${match.name}" @ ${match.price} €`,
          );
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
          // Not in this week's offers means no price: see the file header for
          // why Kaufland has no usable regular-price source.
          console.warn(`[kaufland] Not on offer this week: "${product.productName}"`);
        }
      }
      return results;
    } finally {
      await page.context().close();
    }
  }
}
