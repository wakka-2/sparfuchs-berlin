/**
 * Aldi Nord scraper — scrapes weekly offers from aldi-nord.de/angebote.html
 *
 * Flow:
 * 1. Load the offers page, accept cookies
 * 2. Scroll to load all lazy-rendered product tiles
 * 3. Parse each .product-tile for name / price / image
 * 4. For fetchAll(): fuzzy-match offer names to catalog products
 *
 * Price format: "2.89**" (dot notation, ** = disclaimer suffix)
 * Tile text order: [XXL\n\n,] PRODUCT NAME, price**, unit_info, [kg = X.XX,]
 *                  EINKAUFSLISTE, PRODUCT NAME (repeated)
 */
import type { RawProductData, StoreSource } from "../types.js";
import { newPage } from "../browser.js";

const OFFERS_URL = "https://www.aldi-nord.de/angebote.html";

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
 * Parse a single Aldi Nord product tile.
 *
 * Text examples:
 *   "XXL\n\nMini-Cherryrispentomaten\n2.89**\n500-g-Schale\nkg = 5.78\nEINKAUFSLISTE\nMini-Cherryrispentomaten"
 *   "Spargel\n4.39**\n500-g-Bund\nkg = 8.78\nEINKAUFSLISTE\nSpargel"
 *   "Porree\n0.55**\nStück\nEINKAUFSLISTE\nPorree"
 *
 * The product name appears first (and again at the end — duplicated).
 * Price is X.XX** format. Unit is the line after price.
 */
function parseTileText(text: string, imgSrc: string): ScrapedOffer | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const priceRe = /^(\d+)\.(\d{2})\*{0,2}$/; // "2.89**" or "0.55**"
  const skipRe = /^(EINKAUFSLISTE|XXL)$/i;
  const kgRe = /^kg\s*=/i; // "kg = 5.78"

  let price: number | null = null;
  const textLines: string[] = [];

  for (const line of lines) {
    if (skipRe.test(line)) continue;
    if (kgRe.test(line)) continue;

    const m = line.match(priceRe);
    if (m) {
      if (price === null) {
        price = parseFloat(`${m[1]}.${m[2]}`);
      }
      continue;
    }

    textLines.push(line);
  }

  if (price === null || price <= 0) return null;

  // Name is first text line; last line is often a duplicate of name — remove it
  const name = textLines[0] ?? "";
  if (!name) return null;

  // Unit: second text line, unless it's the same as the name (dedup)
  const remainingLines = textLines.slice(1).filter((l) => l !== name);
  const unitSize = remainingLines[0] ?? "";

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
  const scrollSteps = 10;
  for (let i = 1; i <= scrollSteps; i++) {
    const fraction = i / scrollSteps;
    await page.evaluate((f: number) => {
      window.scrollTo(0, document.body.scrollHeight * f);
    }, fraction);
    await sleep(400);
  }
  await sleep(2000);

  const rawTiles = await page.evaluate(() => {
    const tiles = document.querySelectorAll<HTMLElement>(".product-tile");
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

const COMPOUND_SAFE_WORDS = new Set([
  "gurke", "äpfel", "trauben", "paprika", "joghurt", "tomaten", "bananen",
  "kartoffeln", "zwiebeln", "karotten", "orangen", "zitronen", "birnen",
]);

function nameSimilarity(a: string, b: string): number {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const catalogWords = normalise(a);
  const offerRawWords = normalise(b);
  const offerSet = new Set(offerRawWords);
  if (catalogWords.length === 0) return 0;
  let matches = 0;
  for (const cWord of catalogWords) {
    if (offerSet.has(cWord)) {
      matches++;
    } else if (cWord.length >= 8 || COMPOUND_SAFE_WORDS.has(cWord)) {
      if (offerRawWords.some((oWord) => oWord.includes(cWord))) matches++;
    }
  }
  return matches / catalogWords.length;
}

function isIngredientOnly(offerName: string, catalogName: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß\s]/g, " ").replace(/\s+/g, " ").trim();
  return new RegExp(`\\b(mit|aus)\\b.*\\b${n(catalogName)}\\b`).test(n(offerName));
}

function bestMatch(productName: string, offers: ScrapedOffer[]): ScrapedOffer | null {
  let best: ScrapedOffer | null = null;
  let bestScore = 0.65;
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

export class AldiNordSource implements StoreSource {
  readonly storeSlug = "aldi-nord";

  private offersCache: ScrapedOffer[] | null = null;

  private async getOffers(page: import("playwright").Page): Promise<ScrapedOffer[]> {
    if (this.offersCache) return this.offersCache;
    console.log("[aldi-nord] Scraping weekly offers page...");
    const offers = await scrapeAllOffers(page);
    console.log(`[aldi-nord] Found ${offers.length} offer tiles`);
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
        console.warn(`[aldi-nord] No offer match for "${productName}"`);
        return null;
      }
      console.log(`[aldi-nord] "${productName}" → "${match.name}" @ ${match.price} €`);
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
      console.error(`[aldi-nord] Error: ${err instanceof Error ? err.message : String(err)}`);
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
            `[aldi-nord] "${product.productName}" → "${match.name}" @ ${match.price} €`,
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
          console.warn(`[aldi-nord] No offer match for "${product.productName}"`);
        }
      }
      return results;
    } finally {
      await page.context().close();
    }
  }
}
