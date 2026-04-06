import { describe, it, expect } from "vitest";
import { formatCents, formatUnitPrice } from "../lib/response.js";

describe("formatCents", () => {
  it("formats 119 as '1,19 €'", () => {
    expect(formatCents(119)).toBe("1,19 €");
  });

  it("formats 0 as '0,00 €'", () => {
    expect(formatCents(0)).toBe("0,00 €");
  });

  it("formats 1249 as '12,49 €'", () => {
    expect(formatCents(1249)).toBe("12,49 €");
  });

  it("formats 99 as '0,99 €'", () => {
    expect(formatCents(99)).toBe("0,99 €");
  });

  it("formats large numbers with thousand separator", () => {
    const result = formatCents(123456);
    // German locale uses . for thousands: 1.234,56 €
    expect(result).toContain("1.234,56");
  });
});

describe("formatUnitPrice", () => {
  it("formats per-liter price", () => {
    expect(formatUnitPrice(119, "L")).toBe("1,19 €/L");
  });

  it("formats per-kg price", () => {
    expect(formatUnitPrice(398, "kg")).toBe("3,98 €/kg");
  });

  it("formats per-unit price", () => {
    expect(formatUnitPrice(30, "Stück")).toBe("0,30 €/Stück");
  });
});
