/**
 * REWE — weekly offers from rewe.de/angebote/nationale-angebote/
 *
 * rewe.de sits behind a bot check that rejects plain HTTP requests (403), so
 * this is the one store that still needs a real browser. Offers are read from
 * the tiles' own elements (title, pack size, price tag) rather than from their
 * visible text, which is empty for tiles that have not scrolled into view.
 *
 * The landing page carries every category's offers (the per-category
 * sub-pages now time out), so one page load is enough.
 */
import type { Page } from "playwright";
import type { Offer, StoreSource } from "../types.js";
import { newPage, gotoWithRetry } from "../browser.js";
import { berlinDate, saturdayOf } from "../http.js";

const OFFERS_URL = "https://www.rewe.de/angebote/nationale-angebote/";


export interface ReweTile {
  title: string;
  /** The grey lines under the title: variety, "je 500-g-Pckg.", "(1 kg = 11,58 €)" */
  additional: string[];
  price: string;
  img: string;
}

export function parseReweTiles(tiles: ReweTile[], validUntil: string): Offer[] {
  const offers: Offer[] = [];
  for (const t of tiles) {
    const price = t.price.match(/(\d+),(\d{2})/);
    const name = t.title.trim();
    if (!price || !name) continue;
    const lines = t.additional.map((l) => l.replace(/^[\s,]+/, "").trim()).filter(Boolean);
    offers.push({
      name,
      description: lines.filter((l) => !/\bje\b|=/.test(l)).join(", "),
      price: parseFloat(`${price[1]}.${price[2]}`),
      unitText: lines.find((l) => /\bje\b/.test(l)) ?? "",
      baseText: lines.find((l) => l.includes("=")),
      imageUrl: t.img || undefined,
      url: OFFERS_URL,
      validUntil,
    });
  }
  return offers;
}

async function scrapeTiles(page: Page, url: string): Promise<ReweTile[]> {
  await gotoWithRetry(page, url);
  await page.waitForSelector(".cor-offer-renderer-tile", { state: "attached", timeout: 20_000 });

  // Consent banner (Usercentrics, shadow DOM) — harmless if absent.
  await page
    .evaluate(() => {
      document
        .querySelector("#usercentrics-root")
        ?.shadowRoot?.querySelector<HTMLElement>('button[data-testid="uc-accept-all-button"]')
        ?.click();
    })
    .catch(() => {});

  // Scroll through so the lazy tiles replace their skeletons.
  for (let i = 1; i <= 12; i++) {
    await page.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), i / 12);
    await page.waitForTimeout(400);
  }

  // No named helpers inside: tsx wraps them in a __name() call that does not
  // exist in the page, which makes $$eval throw.
  return page.$$eval(".cor-offer-renderer-tile", (tiles) =>
    tiles.map((tile) => {
      const img = tile.querySelector<HTMLImageElement>('img[data-testid="offer-image"]');
      return {
        title: tile.querySelector(".cor-offer-information__title-link")?.textContent ?? "",
        additional: [...tile.querySelectorAll(".cor-offer-information__additional")].map(
          (el) => el.textContent ?? "",
        ),
        price:
          tile.querySelector(".cor-offer-price__tag-price")?.textContent ||
          tile.querySelector(".cor-offer-price-arrow__new")?.textContent ||
          "",
        img: img?.dataset.src || img?.src || "",
      };
    }),
  );
}

export class ReweSource implements StoreSource {
  readonly storeSlug = "rewe";

  async fetchOffers(): Promise<Offer[]> {
    const page = await newPage();
    try {
      // Same product can appear in two sections — keep one per name + size.
      const byKey = new Map<string, Offer>();
      const tiles = await scrapeTiles(page, OFFERS_URL);
      for (const o of parseReweTiles(tiles, saturdayOf(berlinDate()))) {
        byKey.set(`${o.name}|${o.unitText}`, o);
      }
      return [...byKey.values()];
    } finally {
      await page.context().close();
    }
  }
}
