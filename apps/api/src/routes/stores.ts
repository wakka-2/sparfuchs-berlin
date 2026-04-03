import { Hono } from "hono";
import { listStores } from "../services/product.service.js";
import { success } from "../lib/response.js";

const app = new Hono();

app.get("/", async (c) => {
  const storeList = await listStores();
  return success(c, { stores: storeList });
});

export default app;
