/**
 * Google Analytics 4, only with consent (DSGVO / TTDSG): nothing is loaded
 * and no cookie is set until the visitor clicks "Akzeptieren". Without a
 * VITE_GA_MEASUREMENT_ID at build time the whole module is inert.
 */
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export type Consent = "granted" | "denied";
const KEY = "sparfuchs-consent";
const ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() ?? "";

export const analyticsConfigured = () => /^G-[A-Z0-9]{4,}$/.test(ID);

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

let loaded = false;

function load() {
  if (loaded || !analyticsConfigured()) return;
  loaded = true;
  window[`ga-disable-${ID}`] = false;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the arguments object itself, as Google's snippet does.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // Page views are sent by the router (single-page app), not on load.
  window.gtag("config", ID, { send_page_view: false, anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
  document.head.appendChild(s);
}

/** Stop sending and remove Google's cookies when consent is withdrawn. */
function unload() {
  if (!analyticsConfigured()) return;
  window[`ga-disable-${ID}`] = true;
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      for (const domain of ["", `; domain=${location.hostname}`, `; domain=.${location.hostname}`]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
      }
    }
  }
}

const listeners = new Set<() => void>();
export const onConsentChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function setConsent(c: Consent) {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
  if (c === "granted") load();
  else unload();
  listeners.forEach((fn) => fn());
}

/** Call once at start-up: resumes analytics for visitors who already agreed. */
export function initAnalytics() {
  if (readConsent() === "granted") load();
}

export function track(event: string, params: Record<string, string | number> = {}) {
  if (!loaded || readConsent() !== "granted" || !window.gtag) return;
  window.gtag("event", event, params);
}

export function trackPageView(path: string) {
  track("page_view", { page_path: path, page_location: location.href, page_title: document.title });
}

/** Ask the consent banner to open again (footer "Cookie-Einstellungen"). */
export const openConsentSettings = () => window.dispatchEvent(new Event("sparfuchs:consent-open"));
