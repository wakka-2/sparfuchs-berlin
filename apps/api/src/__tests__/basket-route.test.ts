import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/basket.service.js", () => ({
  calculateBasket: vi.fn(),
}));

import { Hono } from "hono";
import basketRouter from "../routes/basket.js";
import * as basketService from "../services/basket.service.js";

const app = new Hono().basePath("/api/v1");
app.route("/basket", basketRouter);

const mockCalculateBasket = vi.mocked(basketService.calculateBasket);

const VALID_UUID_1 = "550e8400-e29b-41d4-a716-446655440001";
const VALID_UUID_2 = "550e8400-e29b-41d4-a716-446655440002";

const SAMPLE_BASKET_RESULT = {
  items: [
    {
      product_id: VALID_UUID_1,
      name: "Vollmilch",
      quantity: 2,
      prices: {
        rewe: { unit_cents: 119, subtotal_cents: 238 },
        lidl: { unit_cents: 99, subtotal_cents: 198 },
      },
    },
    {
      product_id: VALID_UUID_2,
      name: "Butter",
      quantity: 1,
      prices: {
        rewe: { unit_cents: 189, subtotal_cents: 189 },
        lidl: { unit_cents: 179, subtotal_cents: 179 },
      },
    },
  ],
  totals: {
    rewe: {
      total_cents: 427,
      total_formatted: "4,27 €",
      items_available: 2,
      items_missing: 0,
      missing_products: [],
    },
    lidl: {
      total_cents: 377,
      total_formatted: "3,77 €",
      items_available: 2,
      items_missing: 0,
      missing_products: [],
    },
  },
  recommendation: {
    cheapest_complete_store: "lidl",
    cheapest_store: "lidl",
    max_savings_cents: 50,
    max_savings_formatted: "0,50 €",
    savings_percentage: 11.7,
    note: "Lidl is cheapest.",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/basket/calculate", () => {
  it("returns basket calculation for valid items", async () => {
    mockCalculateBasket.mockResolvedValue(SAMPLE_BASKET_RESULT);

    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { product_id: VALID_UUID_1, quantity: 2 },
          { product_id: VALID_UUID_2, quantity: 1 },
        ],
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.recommendation.cheapest_store).toBe("lidl");
    expect(mockCalculateBasket).toHaveBeenCalledWith([
      { product_id: VALID_UUID_1, quantity: 2 },
      { product_id: VALID_UUID_2, quantity: 1 },
    ]);
  });

  it("returns 404 when service returns null (no valid products)", async () => {
    mockCalculateBasket.mockResolvedValue(null);

    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: VALID_UUID_1, quantity: 1 }],
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for empty items array", async () => {
    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    expect(res.status).toBe(400);
    expect(mockCalculateBasket).not.toHaveBeenCalled();
  });

  it("returns 400 when items array exceeds 50", async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      product_id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
      quantity: 1,
    }));

    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when product_id is not a UUID", async () => {
    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: "not-a-uuid", quantity: 1 }],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ this is not json }",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when quantity is 0", async () => {
    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: VALID_UUID_1, quantity: 0 }],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when items field is missing", async () => {
    const res = await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("correctly passes quantity to service", async () => {
    mockCalculateBasket.mockResolvedValue(SAMPLE_BASKET_RESULT);

    await app.request("/api/v1/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: VALID_UUID_1, quantity: 3 }],
      }),
    });

    expect(mockCalculateBasket).toHaveBeenCalledWith([
      { product_id: VALID_UUID_1, quantity: 3 },
    ]);
  });
});
