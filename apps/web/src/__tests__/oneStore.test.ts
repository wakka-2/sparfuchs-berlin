import { describe, it, expect } from "vitest";
import { pickOneStore, type BasketForPlan } from "../lib/oneStore";

const result: BasketForPlan = {
  items: [
    { product_id: "butter", name: "Butter", prices: { aldi: { subtotal_cents: 115 }, rewe: { subtotal_cents: 129 } } },
    { product_id: "eier", name: "Eier", prices: { aldi: { subtotal_cents: 249 } } },
    { product_id: "kaffee", name: "Kaffee", prices: { aldi: { subtotal_cents: 449 }, rewe: { subtotal_cents: 399 } } },
  ],
  totals: {
    aldi: { store_name: "Aldi Nord", total_cents: 813, items_available: 3, missing_products: [] },
    rewe: { store_name: "REWE", total_cents: 528, items_available: 2, missing_products: ["Eier"] },
  },
};

describe("pickOneStore", () => {
  it("picks the store covering most of the list and prices the convenience", () => {
    expect(pickOneStore(result, 4)).toEqual({
      slug: "aldi", storeName: "Aldi Nord", covered: 3, listSize: 4, totalCents: 813,
      extraCents: 50, // Kaffee is 50 ct cheaper at REWE
      missing: [],
    });
  });

  it("breaks a coverage tie by the lower total", () => {
    const tie: BasketForPlan = { ...result, totals: { ...result.totals, rewe: { ...result.totals.rewe, items_available: 3, total_cents: 700 } } };
    expect(pickOneStore(tie, 3)?.slug).toBe("rewe");
  });

  it("returns null when no store has anything", () => {
    expect(pickOneStore({ items: [], totals: {} }, 2)).toBeNull();
  });
});
