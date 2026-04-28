import { describe, it, expect } from "vitest";
import {
  parseUnitSize,
  calculateUnitPriceCents,
  euroToCents,
  cleanProductName,
  normalizePrice,
} from "./index.js";

describe("parseUnitSize", () => {
  it("parses grams: '500g'", () => {
    expect(parseUnitSize("500g")).toEqual({ value: 500, unit: "g" });
  });

  it("parses kilograms: '1kg'", () => {
    expect(parseUnitSize("1kg")).toEqual({ value: 1, unit: "kg" });
  });

  it("parses liters: '1.5L'", () => {
    expect(parseUnitSize("1.5L")).toEqual({ value: 1.5, unit: "L" });
  });

  it("parses German decimal: '1,5L'", () => {
    expect(parseUnitSize("1,5L")).toEqual({ value: 1.5, unit: "L" });
  });

  it("parses milliliters: '200ml'", () => {
    expect(parseUnitSize("200ml")).toEqual({ value: 200, unit: "ml" });
  });

  it("parses with space: '500 g'", () => {
    expect(parseUnitSize("500 g")).toEqual({ value: 500, unit: "g" });
  });

  it("parses Stück: '10 Stück'", () => {
    expect(parseUnitSize("10 Stück")).toEqual({ value: 10, unit: "Stück" });
  });

  it("parses count pattern: '10er'", () => {
    expect(parseUnitSize("10er")).toEqual({ value: 10, unit: "Stück" });
  });

  it("parses long form: '1 Liter'", () => {
    expect(parseUnitSize("1 Liter")).toEqual({ value: 1, unit: "L" });
  });

  it("returns null for empty string", () => {
    expect(parseUnitSize("")).toBeNull();
  });

  it("returns null for unparseable string", () => {
    expect(parseUnitSize("some random text")).toBeNull();
  });
});

describe("calculateUnitPriceCents", () => {
  it("calculates per-kg price from grams", () => {
    // 199 cents for 500g → 398 cents per kg
    expect(calculateUnitPriceCents(199, 500, "g")).toBe(398);
  });

  it("calculates per-liter price from ml", () => {
    // 89 cents for 200ml → 445 cents per L
    expect(calculateUnitPriceCents(89, 200, "ml")).toBe(445);
  });

  it("calculates per-kg price directly", () => {
    // 299 cents for 1kg → 299 cents per kg
    expect(calculateUnitPriceCents(299, 1, "kg")).toBe(299);
  });

  it("calculates per-liter price directly", () => {
    // 119 cents for 1.5L → 79 cents per L
    expect(calculateUnitPriceCents(119, 1.5, "L")).toBe(79);
  });

  it("calculates per-unit price for Stück", () => {
    // 299 cents for 10 Stück → 30 cents per Stück
    expect(calculateUnitPriceCents(299, 10, "Stück")).toBe(30);
  });
});

describe("euroToCents", () => {
  it("converts 1.99 to 199", () => {
    expect(euroToCents(1.99)).toBe(199);
  });

  it("converts 0.89 to 89", () => {
    expect(euroToCents(0.89)).toBe(89);
  });

  it("converts 12.49 to 1249", () => {
    expect(euroToCents(12.49)).toBe(1249);
  });

  it("handles floating-point edge case 2.10", () => {
    expect(euroToCents(2.1)).toBe(210);
  });
});

describe("cleanProductName", () => {
  it("strips HTML tags", () => {
    expect(cleanProductName("<b>Milch</b> 3,5%")).toBe("Milch 3,5%");
  });

  it("normalizes whitespace", () => {
    expect(cleanProductName("  Vollmilch   3,5%  ")).toBe("Vollmilch 3,5%");
  });

  it("decodes HTML entities", () => {
    expect(cleanProductName("Brot &amp; Backwaren")).toBe("Brot & Backwaren");
  });
});

describe("normalizePrice", () => {
  it("normalizes a standard product", () => {
    const result = normalizePrice(
      {
        externalId: "123",
        name: "Vollmilch",
        price: 1.19,
        currency: "EUR",
        unitSize: "1L",
      },
      "match-uuid-1",
      "L",
    );

    expect(result).toEqual({
      productMatchId: "match-uuid-1",
      priceCents: 119,
      unitSize: "1L",
      unitType: "L",
      unitPriceCents: 119,
      isEstimated: false,
    });
  });

  it("normalizes grams to per-kg unit price", () => {
    const result = normalizePrice(
      {
        externalId: "456",
        name: "Butter",
        price: 1.99,
        currency: "EUR",
        unitSize: "250g",
      },
      "match-uuid-2",
      "g",
    );

    expect(result).toEqual({
      productMatchId: "match-uuid-2",
      priceCents: 199,
      unitSize: "250g",
      unitType: "kg",
      unitPriceCents: 796,
      isEstimated: false,
    });
  });

  it("returns null for zero price", () => {
    const result = normalizePrice(
      {
        externalId: "789",
        name: "Free Item",
        price: 0,
        currency: "EUR",
        unitSize: "1kg",
      },
      "match-uuid-3",
      "kg",
    );

    expect(result).toBeNull();
  });

  it("uses default unit when unitSize is empty", () => {
    const result = normalizePrice(
      {
        externalId: "101",
        name: "Gurke",
        price: 0.79,
        currency: "EUR",
        unitSize: "",
      },
      "match-uuid-4",
      "Stück",
    );

    expect(result).toEqual({
      productMatchId: "match-uuid-4",
      priceCents: 79,
      unitSize: "1Stück",
      unitType: "Stück",
      unitPriceCents: 79,
      isEstimated: false,
    });
  });
});
