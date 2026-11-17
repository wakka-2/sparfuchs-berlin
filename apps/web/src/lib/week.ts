/**
 * The flyer week in Berlin time. German weekly offers run Monday–Saturday;
 * shops are closed on Sunday and the next flyer starts on Monday.
 */

/** The UTC instant of a Berlin wall-clock time ("2026-11-21", 23, 59, 59). */
export function berlinTime(isoDate: string, h: number, m = 0, s = 0): Date {
  const [y, mo, d] = isoDate.split("-").map(Number);
  // Start from the same wall-clock time in UTC, then correct by Berlin's offset
  // at that moment (CET +1 / CEST +2), so DST changes are handled.
  const guess = Date.UTC(y, mo - 1, d, h, m, s);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asBerlin = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return new Date(guess - (asBerlin - guess));
}

/** ISO date `days` after `isoDate`. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First Monday after the offers' last day. */
export function nextFlyerStart(validUntil: string): string {
  let d = addDays(validUntil, 1);
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, 1);
  return d;
}

export interface WeekPhase {
  /** "ends": counting down to the offers' end; "starts": waiting for the next flyer */
  mode: "ends" | "starts";
  target: Date;
  nextStart: string;
}

export function weekPhase(validUntil: string, now: Date = new Date()): WeekPhase {
  const nextStart = nextFlyerStart(validUntil);
  const end = berlinTime(validUntil, 23, 59, 59);
  if (now < end) return { mode: "ends", target: end, nextStart };
  return { mode: "starts", target: berlinTime(nextStart, 0), nextStart };
}

/** Whole days, hours, minutes, seconds until `target` (never negative). */
export function remaining(target: Date, now: Date = new Date()) {
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return {
    total,
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Today's date in Berlin (ISO). */
export function berlinToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(now);
}

/** The most recent Saturday up to today — the last day of the latest flyer week. */
export function lastSaturday(now: Date = new Date()): string {
  let d = berlinToday(now);
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 6) d = addDays(d, -1);
  return d;
}
