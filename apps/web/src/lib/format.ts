/** Locale for dates and numbers follows the UI language. */
export const locale = (lang: string) => (lang === "en" ? "en-GB" : "de-DE");

export function formatCents(cents: number, lang = "de"): string {
  return (cents / 100).toLocaleString(locale(lang), { style: "currency", currency: "EUR" });
}

/** "Sa., 21.11." — the offer's last day, as flyers print it. */
export function formatValidUntil(isoDate: string, lang = "de"): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(locale(lang), {
    weekday: "short", day: "2-digit", month: "2-digit",
  });
}

/** Days left including today; 0 when the offer ends today. */
export function daysLeft(isoDate: string, now: Date = new Date()): number {
  const end = new Date(`${isoDate}T23:59:59`);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86_400_000));
}

/**
 * A store's base-price text in one style: "(1 kg = 11,58 €)", "1 kg = 5.56"
 * and "1 Liter = 0.59" all become "1 kg = 11,58 €".
 */
export function formatBasePrice(text: string): string {
  const clean = text.replace(/[()€]/g, "").replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s+/g, " ").trim();
  return clean ? `${clean} €` : "";
}

/** "250-g-Packung · " — or nothing when the store's text carries no size ("je"). */
export const packPrefix = (unitSize: string) => (/\d/.test(unitSize) ? `${unitSize} · ` : "");
