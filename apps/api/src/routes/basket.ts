import { Hono } from "hono";
import { BasketRequestSchema } from "@sparfuchs/shared";
import { calculateBasket } from "../services/basket.service.js";
import { success, error } from "../lib/response.js";

const app = new Hono();

app.post("/calculate", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return error(c, 400, "VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = BasketRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, "VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const result = await calculateBasket(parsed.data.items);

  if (!result) {
    return error(c, 404, "NOT_FOUND", "No valid products found for the given IDs");
  }

  return success(c, result);
});

export default app;
