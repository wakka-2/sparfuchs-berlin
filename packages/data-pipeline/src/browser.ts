/**
 * Shared Playwright browser manager.
 *
 * Keeps a single Chromium instance alive for the duration of a pipeline run
 * so each scraper doesn't launch/close its own. Call `getBrowser()` to get
 * the shared instance and `closeBrowser()` after the pipeline finishes.
 */
import { chromium, type Browser, type Page, type Response } from "playwright";

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
 * Chromium network errors that are worth retrying — transient DNS / socket /
 * timeout failures rather than a genuinely missing or blocked page.
 * A 404 or WAF block is NOT in this list: those fail fast on the first attempt.
 */
const TRANSIENT_NAV_ERRORS = [
  "ERR_NAME_NOT_RESOLVED",
  "ERR_CONNECTION_RESET",
  "ERR_CONNECTION_CLOSED",
  "ERR_CONNECTION_FAILED",
  "ERR_CONNECTION_TIMED_OUT",
  "ERR_NETWORK_CHANGED",
  "ERR_INTERNET_DISCONNECTED",
  "ERR_ADDRESS_UNREACHABLE",
  "ERR_SOCKET_NOT_CONNECTED",
  "Timeout",
];

/**
 * Navigate to `url`, retrying on transient network failures with exponential
 * backoff (1s, then 2s). Store sites intermittently fail DNS resolution or
 * reset the connection mid-run; without a retry a single blip silently costs
 * that product its price for the whole day.
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  options: { timeout?: number; attempts?: number } = {},
): Promise<Response | null> {
  const { timeout = 25000, attempts = 3 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = TRANSIENT_NAV_ERRORS.some((code) => msg.includes(code));

      if (!isTransient || attempt === attempts) throw err;

      const backoffMs = 1000 * 2 ** (attempt - 1);
      console.warn(
        `[browser] ${url} failed (attempt ${attempt}/${attempts}): ${msg} — retrying in ${backoffMs}ms`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
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
