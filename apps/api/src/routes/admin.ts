import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { listReviews, decideReview } from "../services/review.service.js";
import { success, error } from "../lib/response.js";

/**
 * The review queue. Only for the site owner: every request needs
 * `Authorization: Bearer <ADMIN_TOKEN>`. Without ADMIN_TOKEN configured
 * (or with a weak one) the whole section is switched off.
 */
const app = new Hono();

const tokenOk = (got: string, want: string) => {
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
};

app.use("*", async (c, next) => {
  const want = process.env.ADMIN_TOKEN ?? "";
  if (want.length < 24) return error(c, 503, "ADMIN_DISABLED", "Review is not configured");
  const got = c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!tokenOk(got, want)) return error(c, 401, "UNAUTHORIZED", "Invalid token");
  c.header("Cache-Control", "no-store");
  await next();
});

const listSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]).optional().default("pending") });

app.get("/reviews", async (c) => {
  const parsed = listSchema.safeParse(c.req.query());
  if (!parsed.success) return error(c, 400, "VALIDATION_ERROR", parsed.error.issues[0].message);
  return success(c, { reviews: await listReviews(parsed.data.status) });
});

const decideSchema = z.object({ status: z.enum(["approved", "rejected"]) });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.post("/reviews/:id", async (c) => {
  const id = c.req.param("id");
  if (!uuid.test(id)) return error(c, 400, "VALIDATION_ERROR", "Invalid review ID format");
  const parsed = decideSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return error(c, 400, "VALIDATION_ERROR", "status must be approved or rejected");
  if (!(await decideReview(id, parsed.data.status))) return error(c, 404, "NOT_FOUND", "Review not found");
  return success(c, { id, status: parsed.data.status });
});

export default app;
