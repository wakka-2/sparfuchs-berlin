import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/product.service.js", () => ({
  listProducts: vi.fn(),
  getProductById: vi.fn(),
  searchProducts: vi.fn(),
  listCategories: vi.fn(),
  listStores: vi.fn(),
}));

import { Hono } from "hono";
import categoriesRouter from "../routes/categories.js";
import storesRouter from "../routes/stores.js";
import * as productService from "../services/product.service.js";

const app = new Hono().basePath("/api/v1");
app.route("/categories", categoriesRouter);
app.route("/stores", storesRouter);

const mockListCategories = vi.mocked(productService.listCategories);
const mockListStores = vi.mocked(productService.listStores);

const SAMPLE_CATEGORIES = [
  { slug: "dairy", name: "Milchprodukte", icon: "🥛", product_count: 12, sort_order: 1 },
  { slug: "bread", name: "Brot & Gebäck", icon: "🍞", product_count: 8, sort_order: 2 },
  { slug: "produce", name: "Obst & Gemüse", icon: "🥦", product_count: 15, sort_order: 3 },
];

const SAMPLE_STORES = [
  {
    slug: "rewe",
    name: "REWE",
    logo_url: null,
    website_url: "https://www.rewe.de",
    color_hex: "#E60028",
    product_count: 50,
    last_updated: "2026-04-14T05:00:00.000Z",
  },
  {
    slug: "lidl",
    name: "Lidl",
    logo_url: null,
    website_url: "https://www.lidl.de",
    color_hex: "#0050AA",
    product_count: 50,
    last_updated: "2026-04-14T05:30:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /categories ──────────────────────────────────────────────────────────

describe("GET /api/v1/categories", () => {
  it("returns categories list", async () => {
    mockListCategories.mockResolvedValue(SAMPLE_CATEGORIES);

    const res = await app.request("/api/v1/categories");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.categories).toHaveLength(3);
    expect(body.data.categories[0].slug).toBe("dairy");
    expect(body.data.categories[0].product_count).toBe(12);
    expect(mockListCategories).toHaveBeenCalledWith("de");
  });

  it("passes lang=en to service", async () => {
    mockListCategories.mockResolvedValue(SAMPLE_CATEGORIES);

    await app.request("/api/v1/categories?lang=en");
    expect(mockListCategories).toHaveBeenCalledWith("en");
  });

  it("returns correct response envelope structure", async () => {
    mockListCategories.mockResolvedValue([]);

    const res = await app.request("/api/v1/categories");
    const body = await res.json();

    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("data.categories");
    expect(body).toHaveProperty("meta.timestamp");
  });
});

// ─── GET /stores ──────────────────────────────────────────────────────────────

describe("GET /api/v1/stores", () => {
  it("returns stores list", async () => {
    mockListStores.mockResolvedValue(SAMPLE_STORES);

    const res = await app.request("/api/v1/stores");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.stores).toHaveLength(2);
    expect(body.data.stores[0].slug).toBe("rewe");
    expect(body.data.stores[1].slug).toBe("lidl");
  });

  it("includes last_updated timestamp per store", async () => {
    mockListStores.mockResolvedValue(SAMPLE_STORES);

    const res = await app.request("/api/v1/stores");
    const body = await res.json();

    const rewe = body.data.stores.find((s: { slug: string }) => s.slug === "rewe");
    expect(rewe.last_updated).toBe("2026-04-14T05:00:00.000Z");
    expect(rewe.product_count).toBe(50);
  });

  it("includes color_hex for store branding", async () => {
    mockListStores.mockResolvedValue(SAMPLE_STORES);

    const res = await app.request("/api/v1/stores");
    const body = await res.json();

    const lidl = body.data.stores.find((s: { slug: string }) => s.slug === "lidl");
    expect(lidl.color_hex).toBe("#0050AA");
  });

  it("returns correct envelope structure", async () => {
    mockListStores.mockResolvedValue([]);

    const res = await app.request("/api/v1/stores");
    const body = await res.json();

    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("data.stores");
    expect(body).toHaveProperty("meta.timestamp");
  });
});
