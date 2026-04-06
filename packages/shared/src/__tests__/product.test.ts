import { describe, it, expect } from "vitest";
import { ProductSchema, StorePriceSchema, ProductSavingsSchema } from "../types/product.js";

describe("StorePriceSchema", () => {
  const validPrice = {
    store_slug: "rewe",
    store_name: "REWE",
    store_color: "#CC0000",
    price_cents: 119,
    price_formatted: "1,19 €",
    unit_size: "1L",
    unit_price_cents: 119,
    unit_price_formatted: "1,19 €/L",
    fetched_at: "2026-03-30T04:00:00Z",
    is_cheapest: true,
  };

  it("accepts valid store price", () => {
    expect(StorePriceSchema.safeParse(validPrice).success).toBe(true);
  });

  it("accepts null store_color", () => {
    expect(StorePriceSchema.safeParse({ ...validPrice, store_color: null }).success).toBe(true);
  });

  it("rejects missing price_cents", () => {
    const { price_cents: _omitted, ...rest } = validPrice;
    void _omitted;
    expect(StorePriceSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ProductSavingsSchema", () => {
  it("accepts valid savings", () => {
    const result = ProductSavingsSchema.safeParse({
      amount_cents: 10,
      percentage: 7.75,
      cheapest_store_slug: "rewe",
      label: "0,10 € günstiger bei REWE",
    });
    expect(result.success).toBe(true);
  });
});

describe("ProductSchema", () => {
  it("accepts valid product", () => {
    const result = ProductSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Vollmilch 3.5%",
      category: { slug: "dairy", name: "Milchprodukte" },
      image_url: null,
      default_unit: "L",
      prices: [],
      savings: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID id", () => {
    const result = ProductSchema.safeParse({
      id: "not-valid",
      name: "Milk",
      category: { slug: "dairy", name: "Dairy" },
      image_url: null,
      default_unit: "L",
      prices: [],
      savings: null,
    });
    expect(result.success).toBe(false);
  });
});
