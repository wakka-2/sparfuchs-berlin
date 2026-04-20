/**
 * Shared Playwright browser manager.
 *
 * Keeps a single Chromium instance alive for the duration of a pipeline run
 * so each scraper doesn't launch/close its own. Call `getBrowser()` to get
 * the shared instance and `closeBrowser()` after the pipeline finishes.
 */
import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Open a new page with sensible defaults for scraping German grocery sites:
 * - German locale + timezone
 * - Realistic viewport
 * - Extra headers to avoid bot detection
 */
export async function newPage() {
  const b = await getBrowser();
  const ctx = await b.newContext({
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "de-DE,de;q=0.9",
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  return ctx.newPage();
}
