import { Hono } from "hono";
import { listCategories } from "../services/product.service.js";
import { success } from "../lib/response.js";

const app = new Hono();

app.get("/", async (c) => {
  const lang = (c.req.query("lang") as "de" | "en") ?? "de";
  const categories = await listCategories(lang);
  return success(c, { categories });
});

export default app;
