import { describe, it, expect } from "vitest";
import { berlinTime, nextFlyerStart, weekPhase, remaining, lastSaturday } from "../lib/week";

describe("flyer week", () => {
  it("converts Berlin wall-clock time to UTC in winter and summer", () => {
    expect(berlinTime("2026-11-21", 23, 59, 59).toISOString()).toBe("2026-11-21T22:59:59.000Z"); // CET
    expect(berlinTime("2026-07-04", 23, 59, 59).toISOString()).toBe("2026-07-04T21:59:59.000Z"); // CEST
  });

  it("starts the next flyer on the Monday after the last day", () => {
    expect(nextFlyerStart("2026-11-21")).toBe("2026-11-23"); // Sat → Mon
    expect(nextFlyerStart("2026-11-18")).toBe("2026-11-23"); // a mid-week end still waits for Monday
  });

  it("counts down to Saturday night during the week", () => {
    const p = weekPhase("2026-11-21", new Date("2026-11-17T18:00:00Z"));
    expect(p.mode).toBe("ends");
    expect(remaining(p.target, new Date("2026-11-17T18:00:00Z"))).toMatchObject({ days: 4, hours: 4, minutes: 59, seconds: 59 });
  });

  it("counts down to Monday once the offers ended", () => {
    const now = new Date("2026-11-22T10:00:00Z"); // Sunday
    const p = weekPhase("2026-11-21", now);
    expect(p.mode).toBe("starts");
    expect(p.target.toISOString()).toBe("2026-11-22T23:00:00.000Z");
    expect(remaining(p.target, now).hours).toBe(13);
  });

  it("never goes negative", () => {
    expect(remaining(new Date(0)).total).toBe(0);
  });

  it("falls back to the last Saturday when no offer is current (Sunday)", () => {
    expect(lastSaturday(new Date("2026-11-22T10:00:00Z"))).toBe("2026-11-21");
    expect(lastSaturday(new Date("2026-11-21T22:30:00Z"))).toBe("2026-11-21"); // still Saturday in Berlin
  });
});
