import { describe, it, expect } from "vitest";
import { Hono } from "hono";

// Standalone health route test (no DB needed)
describe("GET /health (standalone)", () => {
  const app = new Hono();

  app.get("/health", (c) => {
    return c.json({
      success: true,
      data: {
        status: "healthy",
        version: "1.0.0",
        database: "test",
      },
    });
  });

  it("returns 200 with healthy status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.version).toBe("1.0.0");
  });
});

describe("API response envelope", () => {
  const app = new Hono();

  app.get("/success", (c) =>
    c.json({
      success: true,
      data: { items: [] },
      meta: { timestamp: new Date().toISOString() },
    }),
  );

  app.get("/error", (c) =>
    c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found" },
        meta: { timestamp: new Date().toISOString() },
      },
      404,
    ),
  );

  it("success envelope has correct shape", async () => {
    const res = await app.request("/success");
    const body = await res.json();

    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("meta");
    expect(body.meta).toHaveProperty("timestamp");
  });

  it("error envelope has correct shape", async () => {
    const res = await app.request("/error");
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toHaveProperty("success", false);
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("code", "NOT_FOUND");
    expect(body.error).toHaveProperty("message", "Not found");
  });
});
