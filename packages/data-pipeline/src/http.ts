/** Plain HTTP GET with a browser-like identity and retries on transient failures. */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "de-DE,de;q=0.9",
};

export async function fetchText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
      // 4xx is a real answer (blocked, gone) — retrying will not change it.
      if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
      if (!res.ok) throw new RetryableError(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof RetryableError || err instanceof TypeError || (err as Error).name === "TimeoutError";
      if (!retryable || attempt === attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

class RetryableError extends Error {}

/** Today's date in Berlin as an ISO date — offers are valid by local calendar day. */
export function berlinDate(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

/** ISO date of the Saturday in the same Mon–Sat week as `isoDate` (flyer weeks end Saturday). */
export function saturdayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const weekday = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + (6 - weekday));
  return d.toISOString().slice(0, 10);
}
