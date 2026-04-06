import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { z } from "zod";

describe("Product query validation", () => {
  const listQuerySchema = z.object({
    category: z.string().optional(),
    sort: z.enum(["name", "price_asc", "price_desc", "savings"]).optional().default("name"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    lang: z.enum(["de", "en"]).optional().default("de"),
  });

  it("accepts valid params", () => {
    const result = listQuerySchema.safeParse({
      category: "dairy",
      sort: "price_asc",
      page: "2",
      limit: "10",
      lang: "en",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("dairy");
      expect(result.data.sort).toBe("price_asc");
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
      expect(result.data.lang).toBe("en");
    }
  });

  it("applies defaults for missing params", () => {
    const result = listQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe("name");
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.lang).toBe("de");
    }
  });

  it("rejects invalid sort value", () => {
    const result = listQuerySchema.safeParse({ sort: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects limit > 100", () => {
    const result = listQuerySchema.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });

  it("rejects page < 1", () => {
    const result = listQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers", () => {
    const result = listQuerySchema.safeParse({ page: "5", limit: "30" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(30);
    }
  });
});

describe("Search query validation", () => {
  const searchQuerySchema = z.object({
    q: z.string().min(2),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  });

  it("accepts valid search", () => {
    const result = searchQuerySchema.safeParse({ q: "milch" });
    expect(result.success).toBe(true);
  });

  it("rejects single character query", () => {
    const result = searchQuerySchema.safeParse({ q: "m" });
    expect(result.success).toBe(false);
  });

  it("rejects empty query", () => {
    const result = searchQuerySchema.safeParse({ q: "" });
    expect(result.success).toBe(false);
  });

  it("rejects search limit > 50", () => {
    const result = searchQuerySchema.safeParse({ q: "milch", limit: "60" });
    expect(result.success).toBe(false);
  });
});

describe("UUID validation", () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it("accepts valid UUID", () => {
    expect(uuidRegex.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects short string", () => {
    expect(uuidRegex.test("not-a-uuid")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(uuidRegex.test("")).toBe(false);
  });

  it("accepts uppercase UUID", () => {
    expect(uuidRegex.test("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });
});

describe("Basket validation via Hono route", () => {
  const app = new Hono();
  const BasketSchema = z.object({
    items: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
  });

  app.post("/basket/calculate", async (c) => {
    const body = await c.req.json();
    const parsed = BasketSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        400,
      );
    }
    return c.json({ success: true, data: { items_count: parsed.data.items.length } });
  });

  it("accepts valid basket", async () => {
    const res = await app.request("/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("rejects empty basket", async () => {
    const res = await app.request("/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid product_id", async () => {
    const res = await app.request("/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ product_id: "bad", quantity: 1 }] }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects quantity out of range", async () => {
    const res = await app.request("/basket/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: 100 }],
      }),
    });
    expect(res.status).toBe(400);
  });
});
