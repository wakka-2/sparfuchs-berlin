import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB-dependent services before importing routes
vi.mock("../services/product.service.js", () => ({
  listProducts: vi.fn(),
  getProductById: vi.fn(),
  searchProducts: vi.fn(),
  listCategories: vi.fn(),
  listStores: vi.fn(),
}));

vi.mock("../services/history.service.js", () => ({
  getProductPriceHistory: vi.fn(),
}));

import { Hono } from "hono";
import productsRouter from "../routes/products.js";
import * as productService from "../services/product.service.js";
import * as historyService from "../services/history.service.js";

// Build a test app that mirrors index.ts routing
const app = new Hono().basePath("/api/v1");
app.route("/products", productsRouter);

// Typed mock helpers
const mockListProducts = vi.mocked(productService.listProducts);
const mockGetProductById = vi.mocked(productService.getProductById);
const mockSearchProducts = vi.mocked(productService.searchProducts);
const mockGetHistory = vi.mocked(historyService.getProductPriceHistory);

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

const SAMPLE_PRODUCT = {
  id: VALID_UUID,
  name: "Vollmilch",
  name_de: "Vollmilch",
  name_en: "Whole Milk",
  category: { slug: "dairy", name: "Milchprodukte" },
  image_url: null,
  default_unit: "L",
  prices: [
    {
      store_slug: "rewe",
      store_name: "REWE",
      store_color: "#E60028",
      price_cents: 119,
      price_formatted: "1,19 €",
      unit_size: "1L",
      unit_price_cents: 119,
      unit_price_formatted: "1,19 €/L",
      fetched_at: "2026-04-14T05:00:00.000Z",
      store_image_url: null,
      is_cheapest: false,
    },
    {
      store_slug: "lidl",
      store_name: "Lidl",
      store_color: "#0050AA",
      price_cents: 99,
      price_formatted: "0,99 €",
      unit_size: "1L",
      unit_price_cents: 99,
      unit_price_formatted: "0,99 €/L",
      fetched_at: "2026-04-14T05:30:00.000Z",
      store_image_url: null,
      is_cheapest: true,
    },
  ],
  savings: {
    amount_cents: 20,
    percentage: 16.81,
    cheapest_store_slug: "lidl",
    label: "0,20 € günstiger bei Lidl",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /products ────────────────────────────────────────────────────────────

describe("GET /api/v1/products", () => {
  it("returns product list with pagination meta", async () => {
    mockListProducts.mockResolvedValue({ products: [SAMPLE_PRODUCT], totalItems: 1 });

    const res = await app.request("/api/v1/products");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.products).toHaveLength(1);
    expect(body.data.products[0].id).toBe(VALID_UUID);
    expect(body.meta.pagination.total_items).toBe(1);
    expect(mockListProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, lang: "de" }),
    );
  });

  it("passes category filter to service", async () => {
    mockListProducts.mockResolvedValue({ products: [], totalItems: 0 });

    const res = await app.request("/api/v1/products?category=dairy");
    expect(res.status).toBe(200);
    expect(mockListProducts).toHaveBeenCalledWith(
      expect.objectContaining({ category: "dairy" }),
    );
  });

  it("passes sort and pagination params to service", async () => {
    mockListProducts.mockResolvedValue({ products: [], totalItems: 0 });

    await app.request("/api/v1/products?sort=price_asc&page=2&limit=10");
    expect(mockListProducts).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "price_asc", page: 2, limit: 10 }),
    );
  });

  it("returns 400 for invalid sort value", async () => {
    const res = await app.request("/api/v1/products?sort=invalid");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when limit exceeds 100", async () => {
    const res = await app.request("/api/v1/products?limit=200");
    expect(res.status).toBe(400);
  });

  it("returns 400 when page is 0", async () => {
    const res = await app.request("/api/v1/products?page=0");
    expect(res.status).toBe(400);
  });

  it("passes lang=en to service", async () => {
    mockListProducts.mockResolvedValue({ products: [], totalItems: 0 });

    await app.request("/api/v1/products?lang=en");
    expect(mockListProducts).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "en" }),
    );
  });
});

// ─── GET /products/search ─────────────────────────────────────────────────────

describe("GET /api/v1/products/search", () => {
  it("returns search results", async () => {
    const results = [
      {
        id: VALID_UUID,
        name: "Vollmilch",
        category_slug: "dairy",
        cheapest_price_cents: 99,
        cheapest_store_slug: "lidl",
        relevance_score: 0.85,
      },
    ];
    mockSearchProducts.mockResolvedValue(results);

    const res = await app.request("/api/v1/products/search?q=milch");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.query).toBe("milch");
    expect(body.data.results).toHaveLength(1);
    expect(mockSearchProducts).toHaveBeenCalledWith("milch", 10, "de");
  });

  it("returns empty results array when nothing found", async () => {
    mockSearchProducts.mockResolvedValue([]);

    const res = await app.request("/api/v1/products/search?q=xyznotfound");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results).toEqual([]);
  });

  it("returns 400 when query is only one character", async () => {
    const res = await app.request("/api/v1/products/search?q=m");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when query param is missing", async () => {
    const res = await app.request("/api/v1/products/search");
    expect(res.status).toBe(400);
  });

  it("respects limit param", async () => {
    mockSearchProducts.mockResolvedValue([]);

    await app.request("/api/v1/products/search?q=butter&limit=5");
    expect(mockSearchProducts).toHaveBeenCalledWith("butter", 5, "de");
  });

  it("returns 400 when limit exceeds 50", async () => {
    const res = await app.request("/api/v1/products/search?q=milch&limit=100");
    expect(res.status).toBe(400);
  });
});

// ─── GET /products/:id ────────────────────────────────────────────────────────

describe("GET /api/v1/products/:id", () => {
  it("returns product when found", async () => {
    mockGetProductById.mockResolvedValue(SAMPLE_PRODUCT);

    const res = await app.request(`/api/v1/products/${VALID_UUID}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(VALID_UUID);
    expect(body.data.prices).toHaveLength(2);
    expect(body.data.savings).not.toBeNull();
  });

  it("returns 404 when product not found", async () => {
    mockGetProductById.mockResolvedValue(null);

    const res = await app.request(`/api/v1/products/${VALID_UUID}`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for non-UUID id", async () => {
    const res = await app.request("/api/v1/products/not-a-valid-uuid");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for numeric-only id", async () => {
    const res = await app.request("/api/v1/products/12345");
    expect(res.status).toBe(400);
  });

  it("passes lang param to service", async () => {
    mockGetProductById.mockResolvedValue(SAMPLE_PRODUCT);

    await app.request(`/api/v1/products/${VALID_UUID}?lang=en`);
    expect(mockGetProductById).toHaveBeenCalledWith(VALID_UUID, "en");
  });
});

// ─── GET /products/:id/history ────────────────────────────────────────────────

describe("GET /api/v1/products/:id/history", () => {
  it("returns price history", async () => {
    const historyData = {
      product_id: VALID_UUID,
      history: [
        {
          store_slug: "rewe",
          store_name: "REWE",
          store_color: "#E60028",
          price_cents: 129,
          price_formatted: "1,29 €",
          unit_price_cents: 129,
          valid_from: "2026-03-01T00:00:00.000Z",
          valid_until: "2026-04-14T00:00:00.000Z",
        },
      ],
    };
    mockGetHistory.mockResolvedValue(historyData);

    const res = await app.request(`/api/v1/products/${VALID_UUID}/history`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.product_id).toBe(VALID_UUID);
    expect(body.data.history).toHaveLength(1);
  });

  it("returns 404 when product not found", async () => {
    mockGetHistory.mockResolvedValue(null);

    const res = await app.request(`/api/v1/products/${VALID_UUID}/history`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await app.request("/api/v1/products/bad-id/history");
    expect(res.status).toBe(400);
  });
});
