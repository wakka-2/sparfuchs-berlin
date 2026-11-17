import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/offers.service.js", () => ({ listOffers: vi.fn() }));

import { Hono } from "hono";
import offersRouter from "../routes/offers.js";
import * as offersService from "../services/offers.service.js";

const app = new Hono().basePath("/api/v1");
app.route("/offers", offersRouter);
const mockList = vi.mocked(offersService.listOffers);

describe("GET /api/v1/offers", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockList.mockResolvedValue({ offers: [], total: 120, store_counts: { rewe: 100, penny: 20 } });
  });

  it("defaults to this week's flyer offers, 48 per page", async () => {
    const res = await app.request("/api/v1/offers");
    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith({ type: "offer", page: 1, limit: 48 });
    const body = await res.json();
    expect(body.data.store_counts).toEqual({ rewe: 100, penny: 20 });
    expect(body.meta.pagination).toMatchObject({ total_items: 120, total_pages: 3 });
  });

  it("passes store, search and type through", async () => {
    await app.request("/api/v1/offers?store=aldi-nord&q=%20eier%20&type=regular&page=2");
    expect(mockList).toHaveBeenCalledWith({ store: "aldi-nord", q: "eier", type: "regular", page: 2, limit: 48 });
  });

  it.each(["q=e", "type=cheap", "store=DROP%20TABLE", "limit=500"])("rejects %s", async (qs) => {
    const res = await app.request(`/api/v1/offers?${qs}`);
    expect(res.status).toBe(400);
    expect(mockList).not.toHaveBeenCalled();
  });
});
