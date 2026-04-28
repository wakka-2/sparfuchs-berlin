/**
 * Kaufland scraper — scrapes weekly in-store offers from filiale.kaufland.de
 *
 * URL: https://filiale.kaufland.de/angebote/uebersicht.html
 * Tile selector: .k-product-tile
 *
 * Tile text format:
 *   BRAND
 *   Product description
 *   je X-g-Packg.
 *   (1 kg = X.XX)
 *   -XX%
 *   sale_price    ← this is what we want
 *   original_price
 *   [-YY%         ← optional Kaufland Card price — skip
 *   card_price
 *   original_price]
 *
 * Prices use dot notation (0.35 not 0,35).
 * Product name comes from img alt: "BRAND Description".
 */
import type { RawProductData, StoreSource } from "../types.js";
import { newPage } from "../browser.js";

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
    await sleep(1000);
  } catch {
    // banner not present
  }
}

/**
 * Parse a single Kaufland product tile.
 *
 * Price block pattern: "-XX%\nsale_price\noriginal_price"
 * We take the first sale_price (before the optional Card price block).
 * Product name comes from the image alt attribute.
 */
function parseTile(text: string, imgAlt: string, imgSrc: string): ScrapedOffer | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const priceRe = /^(\d+)\.(\d{2})$/; // "0.35" or "1.79"
  const pctRe = /^-\d+%$/;

  let price: number | null = null;
  let unitSize = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Capture unit info (starts with "je " or contains "-g-" / "-l-" / "-kg-")
    if (!unitSize && /^je\s|[-–]\d+[-–](g|ml|l|kg|cl)[-–]/i.test(line)) {
      unitSize = line;
    }

    // On a discount line, the very next line is the sale price
    if (pctRe.test(line) && price === null) {
      const next = lines[i + 1];
      if (next) {
        const m = next.match(priceRe);
        if (m) {
          price = parseFloat(`${m[1]}.${m[2]}`);
        }
      }
    }
  }

  if (price === null || price <= 0) return null;

  // Name from image alt (most descriptive). Fall back to first two text lines.
  const name = imgAlt.trim() || lines.slice(0, 2).join(" ");
  if (!name) return null;

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
  await page.goto(OFFERS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(3000);
  await acceptCookies(page);
  await sleep(1000);

  // Scroll to trigger lazy-loading across 755+ tiles
  const scrollSteps = 12;
  for (let i = 1; i <= scrollSteps; i++) {
    const fraction = i / scrollSteps;
    await page.evaluate((f: number) => {
      window.scrollTo(0, document.body.scrollHeight * f);
    }, fraction);
    await sleep(400);
  }
  await sleep(2500);

  const rawTiles = await page.evaluate(() => {
    const tiles = document.querySelectorAll<HTMLElement>(".k-product-tile");
    return Array.from(tiles).map((tile) => {
      // Skip SVG/icon images — find the actual product photo
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

  const results: ScrapedOffer[] = [];
  for (const { text, imgAlt, imgSrc } of rawTiles) {
    const parsed = parseTile(text, imgAlt, imgSrc);
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

export class KauflandSource implements StoreSource {
  readonly storeSlug = "kaufland";

  private offersCache: ScrapedOffer[] | null = null;

  private async getOffers(page: import("playwright").Page): Promise<ScrapedOffer[]> {
    if (this.offersCache) return this.offersCache;
    console.log("[kaufland] Scraping weekly offers page...");
    const offers = await scrapeAllOffers(page);
    console.log(`[kaufland] Found ${offers.length} offer tiles`);
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
      if (!match) {
        console.warn(`[kaufland] No offer match for "${productName}"`);
        return null;
      }
      console.log(`[kaufland] "${productName}" → "${match.name}" @ ${match.price} €`);
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
            `[kaufland] "${product.productName}" → "${match.name}" @ ${match.price} €`,
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
          console.warn(`[kaufland] No offer match for "${product.productName}"`);
        }
      }
      return results;
    } finally {
      await page.context().close();
    }
  }
}
