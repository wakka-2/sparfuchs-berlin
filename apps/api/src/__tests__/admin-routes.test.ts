import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../services/review.service.js", () => ({ listReviews: vi.fn(), decideReview: vi.fn(), aiStats: vi.fn() }));

import { Hono } from "hono";
import adminRouter from "../routes/admin.js";
import * as reviewService from "../services/review.service.js";

const app = new Hono().basePath("/api/v1");
app.route("/admin", adminRouter);
const TOKEN = "t".repeat(32);
const auth = { Authorization: `Bearer ${TOKEN}` };
const ID = "550e8400-e29b-41d4-a716-446655440000";

describe("admin review routes", () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = TOKEN;
    vi.mocked(reviewService.listReviews).mockReset().mockResolvedValue([]);
    vi.mocked(reviewService.decideReview).mockReset().mockResolvedValue(true);
  });
  afterEach(() => {
    delete process.env.ADMIN_TOKEN;
  });

  it("is switched off without a strong ADMIN_TOKEN", async () => {
    process.env.ADMIN_TOKEN = "short";
    const res = await app.request("/api/v1/admin/reviews", { headers: auth });
    expect(res.status).toBe(503);
  });

  it.each<Record<string, string>>([{}, { Authorization: "Bearer wrong" }, { Authorization: `Bearer ${TOKEN}x` }])("rejects a missing or wrong token", async (headers) => {
    const res = await app.request("/api/v1/admin/reviews", { headers });
    expect(res.status).toBe(401);
    expect(reviewService.listReviews).not.toHaveBeenCalled();
  });

  it("lists pending items by default, uncached", async () => {
    const res = await app.request("/api/v1/admin/reviews", { headers: auth });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(reviewService.listReviews).toHaveBeenCalledWith("pending");
  });

  it("records a decision", async () => {
    const res = await app.request(`/api/v1/admin/reviews/${ID}`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }),
    });
    expect(res.status).toBe(200);
    expect(reviewService.decideReview).toHaveBeenCalledWith(ID, "approved");
  });

  it.each([
    [ID, { status: "pending" }, 400],
    ["not-a-uuid", { status: "approved" }, 400],
  ])("validates the decision (%s)", async (id, body, code) => {
    const res = await app.request(`/api/v1/admin/reviews/${id}`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    expect(res.status).toBe(code);
    expect(reviewService.decideReview).not.toHaveBeenCalled();
  });

  it("serves AI accuracy stats behind the same token", async () => {
    vi.mocked(reviewService.aiStats).mockResolvedValue({ decisions: { decided: 4, ai_right: 3, pending: 2, precision: 0.75 }, runs: [] });
    expect((await app.request("/api/v1/admin/ai-stats")).status).toBe(401);
    const res = await app.request("/api/v1/admin/ai-stats", { headers: auth });
    expect((await res.json()).data.decisions.precision).toBe(0.75);
  });

  it("404s an unknown item", async () => {
    vi.mocked(reviewService.decideReview).mockResolvedValue(false);
    const res = await app.request(`/api/v1/admin/reviews/${ID}`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }),
    });
    expect(res.status).toBe(404);
  });
});
