import { describe, it, expect } from "vitest";
import { BasketRequestSchema, BasketItemSchema } from "../types/basket.js";

describe("BasketItemSchema", () => {
  it("accepts valid item", () => {
    const result = BasketItemSchema.safeParse({
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      quantity: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID product_id", () => {
    const result = BasketItemSchema.safeParse({
      product_id: "not-a-uuid",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity 0", () => {
    const result = BasketItemSchema.safeParse({
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity > 99", () => {
    const result = BasketItemSchema.safeParse({
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      quantity: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    const result = BasketItemSchema.safeParse({
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      quantity: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("BasketRequestSchema", () => {
  it("accepts valid basket", () => {
    const result = BasketRequestSchema.safeParse({
      items: [
        { product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 },
        { product_id: "660e8400-e29b-41d4-a716-446655440001", quantity: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = BasketRequestSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 50 items", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      product_id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
      quantity: 1,
    }));
    const result = BasketRequestSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it("rejects missing items field", () => {
    const result = BasketRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
