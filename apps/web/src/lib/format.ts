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
