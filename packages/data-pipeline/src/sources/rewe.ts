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
import { newPage } from "../browser.js";

const OFFERS_URL = "https://www.rewe.de/angebote/nationale-angebote/";
const SEARCH_BASE = "https://www.rewe.de/suche/?search=";

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

/** Load all offer tiles from the REWE national offers page. */
async function scrapeAllOffers(
  page: import("playwright").Page,
): Promise<ScrapedOffer[]> {
  await page.goto(OFFERS_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
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

/** Simple name similarity: normalise both strings and count shared words. */
function nameSimilarity(a: string, b: string): number {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  // Score = what fraction of the catalog product's words appear in the offer name.
  // This prevents a single shared word (e.g. "Kaffee") from matching unrelated offers.
  const catalogWords = normalise(a);
  const offerWords = new Set(normalise(b));
  if (catalogWords.length === 0) return 0;

  let matches = 0;
  for (const w of catalogWords) {
    if (offerWords.has(w)) matches++;
  }
  return matches / catalogWords.length;
}

/**
 * Return true if the catalog word appears only as an ingredient in the offer
 * (preceded by "mit" or "aus"), not as the main product.
 * E.g. "Champignons mit Frischkäse" → frischkäse is an ingredient.
 */
function isIngredientOnly(offerName: string, catalogName: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß\s]/g, " ").replace(/\s+/g, " ").trim();
  return new RegExp(`\\b(mit|aus)\\b.*\\b${n(catalogName)}\\b`).test(n(offerName));
}

/** Find the best matching offer for a catalog product name. */
function bestMatch(
  productName: string,
  offers: ScrapedOffer[],
): ScrapedOffer | null {
  let best: ScrapedOffer | null = null;
  let bestScore = 0.65; // require 65% of catalog words to appear in offer name

  for (const offer of offers) {
    if (isIngredientOnly(offer.name, productName)) continue;
    const score = nameSimilarity(productName, offer.name);
    if (score > bestScore) {
      bestScore = score;
      best = offer;
    }
  }
  return best;
}

/**
 * Search REWE's website for a product not found in the weekly offers.
 * rewe.de/suche uses the same cor-offer-renderer-tile component as the offers page.
 */
async function searchCatalog(
  page: import("playwright").Page,
  productName: string,
): Promise<ScrapedOffer | null> {
  const url = `${SEARCH_BASE}${encodeURIComponent(productName)}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(2000);
    await acceptCookies(page);

    // Scroll to load dynamic content
    for (let i = 1; i <= 4; i++) {
      await page.evaluate((f: number) => {
        window.scrollTo(0, document.body.scrollHeight * f);
      }, i / 4);
      await sleep(300);
    }
    await sleep(1000);

    const rawItems = await page.evaluate(() => {
      // Try multiple selector patterns — search page may differ from offers page
      const selectors = [
        ".cor-offer-renderer-tile",
        ".search-product-tile",
        "[class*='product-tile']",
        "[class*='offer-tile']",
        "article[class*='product']",
      ];
      let tiles: NodeListOf<HTMLElement> | null = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll<HTMLElement>(sel);
        if (found.length > 0) { tiles = found; break; }
      }
      if (!tiles) return [];
      return Array.from(tiles).slice(0, 8).map((tile) => {
        const img = tile.querySelector<HTMLImageElement>("img");
        const link = tile.closest<HTMLAnchorElement>("a") ?? tile.querySelector<HTMLAnchorElement>("a");
        return { text: tile.innerText ?? "", imgSrc: img?.src ?? img?.dataset?.src ?? "", href: link?.href ?? "" };
      });
    });

    let best: ScrapedOffer | null = null;
    let bestScore = 0.5; // catalog search: require 50% of catalog words to match
    for (const { text, imgSrc, href } of rawItems) {
      const parsed = parseTileText(text, imgSrc, href);
      if (!parsed) continue;
      const score = nameSimilarity(productName, parsed.name);
      if (score > bestScore) {
        bestScore = score;
        best = parsed;
      }
    }

    if (best) {
      console.log(`[rewe] "${productName}" → catalog "${best.name}" @ ${best.price} €`);
    }
    return best;
  } catch (err) {
    console.warn(
      `[rewe] catalog search failed for "${productName}": ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
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
    const offers = await scrapeAllOffers(page);
    console.log(`[rewe] Found ${offers.length} offer tiles`);
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

      // Not on offer this week — search catalog for regular price
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

      console.warn(`[rewe] No price found for "${productName}"`);
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
          // Catalog search (rewe.de/suche) renders tiles without prices —
          // prices come from shop.rewe.de which blocks headless browsers.
          // Skipping catalog search in batch runs; fetchProduct() still tries it.
          console.warn(`[rewe] Not on offer this week: "${product.productName}"`);
        }
      }
      return results;
    } finally {
      await page.context().close();
    }
  }
}
