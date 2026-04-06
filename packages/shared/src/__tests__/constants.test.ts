import { describe, it, expect } from "vitest";
import { STORES } from "../constants/stores.js";
import { CATEGORIES } from "../constants/categories.js";

describe("STORES", () => {
  it("has rewe and lidl", () => {
    expect(STORES.rewe.name).toBe("REWE");
    expect(STORES.lidl.name).toBe("Lidl");
  });

  it("stores have required fields", () => {
    for (const store of Object.values(STORES)) {
      expect(store.slug).toBeTruthy();
      expect(store.name).toBeTruthy();
      expect(store.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(store.website).toMatch(/^https:\/\//);
    }
  });
});

describe("CATEGORIES", () => {
  it("has 10 categories", () => {
    expect(CATEGORIES).toHaveLength(10);
  });

  it("slugs are unique", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("sort_order is sequential from 1", () => {
    const orders = CATEGORIES.map((c) => c.sort_order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("all have DE and EN names", () => {
    for (const cat of CATEGORIES) {
      expect(cat.name_de).toBeTruthy();
      expect(cat.name_en).toBeTruthy();
    }
  });
});
