/**
 * Per-store product image search via Playwright.
 *
 * Called when a product's price comes from the fallback table and no image
 * was already captured from the weekly offer tile. Each store's search page
 * is loaded; the first product image that matches the search term is returned.
 *
 * Errors are swallowed — a missing image is never fatal for the pipeline.
 */
import { newPage } from "../browser.js";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

interface StoreSearchConfig {
  url: (name: string) => string;
  /** CSS selectors tried in order — first non-placeholder match wins. */
  imgSelectors: string[];
  /** Accept cookie banner before searching */
  acceptCookies?: boolean;
}

const STORE_SEARCH: Record<string, StoreSearchConfig> = {
  rewe: {
    url: (name) =>
      `https://www.rewe.de/suche/?search=${encodeURIComponent(name)}`,
    imgSelectors: [
      ".product-list .cor-product-tile img",
      ".product-tile img",
      ".product-card img",
      "article img",
    ],
    acceptCookies: true,
  },
  kaufland: {
    url: (name) =>
      `https://www.kaufland.de/produkte/alle-produkte/?search=${encodeURIComponent(name)}`,
    imgSelectors: [
      ".k-product-tile img",
      ".product-tile img",
      ".product-card img",
      "article img",
    ],
    acceptCookies: true,
  },
  penny: {
    url: (name) =>
      `https://www.penny.de/produkte?searchTerm=${encodeURIComponent(name)}`,
    imgSelectors: [
      ".offer-tile img",
      ".product-tile img",
      ".plp-product img",
      ".product-item img",
      "article img",
    ],
    acceptCookies: true,
  },
  "aldi-nord": {
    url: (name) =>
      `https://www.aldi-nord.de/suche.html?query=${encodeURIComponent(name)}`,
    imgSelectors: [
      ".product-tile img",
      ".product-grid-item img",
      ".search-results img",
      "article img",
    ],
    acceptCookies: true,
  },
  // lidl: excluded — lidl.de only sells non-food items online; no grocery images available
};

async function dismissCookies(page: import("playwright").Page): Promise<void> {
  try {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll<HTMLElement>("button")];
      const accept = btns.find((b) =>
        /akzeptieren|zustimmen|alle.*cookie|accept all/i.test(b.textContent ?? ""),
      );
      if (accept) accept.click();
      // Usercentrics shadow DOM
      const root = document.querySelector("#usercentrics-root");
      if (root?.shadowRoot) {
        const btn = root.shadowRoot.querySelector<HTMLElement>(
          'button[data-testid="uc-accept-all-button"]',
        );
        if (btn) btn.click();
      }
    });
    await sleep(800);
  } catch {
    // no banner
  }
}

/**
 * Fetch the best product image URL for a given product name from a specific store.
 * Returns null if no image can be found (never throws).
 */
export async function fetchStoreProductImage(
  storeSlug: string,
  productName: string,
): Promise<string | null> {
  const config = STORE_SEARCH[storeSlug];
  if (!config) return null;

  const page = await newPage();
  try {
    const url = config.url(productName);
    console.log(`[image-search] ${storeSlug} searching "${productName}"...`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(1800);

    if (config.acceptCookies) {
      await dismissCookies(page);
      await sleep(500);
    }

    // Try each selector
    for (const selector of config.imgSelectors) {
      const imgSrc = await page.evaluate((sel: string) => {
        const imgs = document.querySelectorAll<HTMLImageElement>(sel);
        for (const img of Array.from(imgs)) {
          const src = img.src || img.dataset.src || img.dataset.lazySrc || "";
          // Skip placeholder/icon/svg/data-uri images
          if (
            src &&
            src.startsWith("http") &&
            !src.includes("placeholder") &&
            !src.includes(".svg") &&
            !src.startsWith("data:") &&
            img.naturalWidth !== 1 // 1×1 tracking pixel
          ) {
            return src;
          }
        }
        return null;
      }, selector);

      if (imgSrc) {
        console.log(`[image-search] ${storeSlug} "${productName}" → ${imgSrc.slice(0, 80)}…`);
        return imgSrc;
      }
    }

    console.warn(`[image-search] ${storeSlug}: no image found for "${productName}"`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[image-search] ${storeSlug} error for "${productName}": ${msg}`);
    return null;
  } finally {
    await page.context().close();
  }
}
