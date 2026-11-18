import { Hono } from "hono";
import { z } from "zod";
import { listOffers } from "../services/offers.service.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

const querySchema = z.object({
  store: z.string().regex(/^[a-z0-9-]{1,50}$/).optional(),
  q: z.string().trim().min(2).max(100).optional(),
  type: z.enum(["offer", "regular", "all"]).optional().default("offer"),
  category: z.string().regex(/^[a-z-]{1,30}$/).optional(),
  sort: z.enum(["relevance", "price", "unit_price"]).optional().default("relevance"),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  limit: z.coerce.number().int().min(1).max(96).optional().default(48),
});

// GET /offers — every current offer the stores publish, for browsing
app.get("/", async (c) => {
  const parsed = querySchema.safeParse(c.req.query());
  if (!parsed.success) return error(c, 400, "VALIDATION_ERROR", parsed.error.issues[0].message);
  const { page, limit } = parsed.data;
  const { offers, total, store_counts, category_counts } = await listOffers(parsed.data);
  return success(c, { offers, store_counts, category_counts }, { page, limit, totalItems: total });
});

export default app;
