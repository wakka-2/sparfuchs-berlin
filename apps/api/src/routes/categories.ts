import { Hono } from "hono";
import { listCategories } from "../services/product.service.js";
import { success } from "../lib/response.js";
import { withCache } from "../lib/cache.js";

const app = new Hono();

app.get("/", async (c) => {
  const lang = (c.req.query("lang") as "de" | "en") ?? "de";
  // Categories change only when products/categories are re-seeded — cache 24h
  const categories = await withCache(`categories:${lang}`, 86400, () => listCategories(lang));
  return success(c, { categories });
});

export default app;
