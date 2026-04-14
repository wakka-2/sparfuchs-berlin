import { Hono } from "hono";
import { listStores } from "../services/product.service.js";
import { success } from "../lib/response.js";
import { withCache } from "../lib/cache.js";

const app = new Hono();

app.get("/", async (c) => {
  // Stores rarely change — cache 1h (pipeline updates last_updated, not store list)
  const storeList = await withCache("stores", 3600, () => listStores());
  return success(c, { stores: storeList });
});

export default app;
