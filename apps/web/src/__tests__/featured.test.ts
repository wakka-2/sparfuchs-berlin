import { describe, it, expect } from "vitest";
import { pickFeatured } from "../lib/featured";
import type { Product, StorePrice } from "../lib/api";

const price = (store: string, unit: number, isOffer = true): StorePrice => ({
  store_slug: store, store_name: store, store_color: null, store_image_url: null,
  price_cents: unit, price_formatted: "", unit_size: "", unit_price_cents: unit,
  unit_price_formatted: "", fetched_at: "", valid_until: "2026-11-21",
  is_cheapest: false, is_estimated: false, is_offer: isOffer,
});
const product = (name: string, cat: string, prices: StorePrice[]): Product => ({
  id: name, name, category: { slug: cat, name: cat }, image_url: null, default_unit: "kg", prices, savings: null,
});

describe("pickFeatured", () => {
  it("ranks flyer offers by saving per unit against the dearest store", () => {
    const picked = pickFeatured([
      product("Butter", "dairy", [price("aldi", 460), price("penny", 636)]),
      product("Bananen", "fruit", [price("aldi", 99), price("kaufland", 199)]),
    ]);
    expect(picked.map((p) => [p.product.name, p.pct])).toEqual([["Bananen", 50], ["Butter", 28]]);
  });

  it("skips everyday prices, single-store products and tiny savings", () => {
    expect(pickFeatured([
      product("Eier", "eggs", [price("aldi", 25, false), price("rewe", 40)]),
      product("Mehl", "pantry", [price("aldi", 59)]),
      product("Milch", "dairy", [price("aldi", 95), price("penny", 99)]),
    ])).toEqual([]);
  });

  it("takes one product per category first, then tops up", () => {
    const picked = pickFeatured([
      product("A", "dairy", [price("x", 10), price("y", 100)]),
      product("B", "dairy", [price("x", 20), price("y", 100)]),
      product("C", "fruit", [price("x", 50), price("y", 100)]),
    ], 3);
    expect(picked.map((p) => p.product.name)).toEqual(["A", "C", "B"]);
  });
});

import { isLoose, priceLines } from "../lib/format";

describe("loose vs packaged", () => {
  it.each(["je kg", "kg-Preis", "Dtsch. Bananen, lose", "1 kg"])("treats %s as loose", (u) => expect(isLoose(u)).toBe(true));
  it.each(["je 1-kg-Packg.", "250-g-Packung", "1,5-L-Flasche", "je Stück", "je 500-g-Schale"])("treats %s as a pack", (u) => expect(isLoose(u)).toBe(false));

  it("leads with the pack price for packs and the kg price for loose goods", () => {
    expect(priceLines({ price_formatted: "1,15 €", unit_price_formatted: "4,60 €/kg", unit_size: "250-g-Packung" }))
      .toEqual({ main: "1,15 €", sub: "250-g-Packung · 4,60 €/kg" });
    expect(priceLines({ price_formatted: "0,99 €", unit_price_formatted: "0,99 €/kg", unit_size: "kg-Preis" }))
      .toEqual({ main: "0,99 €/kg", sub: null });
  });
});
