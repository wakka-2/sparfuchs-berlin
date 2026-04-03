import { Hono } from "hono";
import { z } from "zod";
import { listProducts, getProductById, searchProducts } from "../services/product.service.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

// GET /products
const listQuerySchema = z.object({
  category: z.string().optional(),
  store: z.string().optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "savings"]).optional().default("name"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  lang: z.enum(["de", "en"]).optional().default("de"),
});

app.get("/", async (c) => {
  const parsed = listQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return error(c, 400, "VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const { category, sort, page, limit, lang } = parsed.data;

  const result = await listProducts({ category, sort, page, limit, lang });

  return success(c, { products: result.products }, { page, limit, totalItems: result.totalItems });
});

// GET /products/search
const searchQuerySchema = z.object({
  q: z.string().min(2),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  lang: z.enum(["de", "en"]).optional().default("de"),
});

app.get("/search", async (c) => {
  const parsed = searchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return error(c, 400, "VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const { q, limit, lang } = parsed.data;
  const results = await searchProducts(q, limit, lang);

  return success(c, { query: q, results });
});

// GET /products/:id
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const lang = (c.req.query("lang") as "de" | "en") ?? "de";

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return error(c, 400, "VALIDATION_ERROR", "Invalid product ID format");
  }

  const product = await getProductById(id, lang);

  if (!product) {
    return error(c, 404, "NOT_FOUND", "Product not found");
  }

  return success(c, product);
});

export default app;
