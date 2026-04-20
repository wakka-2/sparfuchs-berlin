import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import productsRoutes from "./routes/products.js";
import categoriesRoutes from "./routes/categories.js";
import storesRoutes from "./routes/stores.js";
import basketRoutes from "./routes/basket.js";
import healthRoutes from "./routes/health.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { captureException } from "./lib/monitoring.js";

const app = new Hono().basePath("/api/v1");

// ── Middleware ────────────────────────────────────
app.use("*", logger());

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  }),
);

// 100 requests per minute per IP (generous for a public price-comparison site)
app.use(
  "*",
  rateLimit({
    max: 100,
    windowMs: 60 * 1000,
  }),
);

// ── Global error handler ─────────────────────────
app.onError((err, c) => {
  captureException(err, { url: c.req.url, method: c.req.method });
  return c.json(
    {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      meta: { timestamp: new Date().toISOString() },
    },
    500,
  );
});

// ── Routes ───────────────────────────────────────
app.route("/products", productsRoutes);
app.route("/categories", categoriesRoutes);
app.route("/stores", storesRoutes);
app.route("/basket", basketRoutes);
app.route("/health", healthRoutes);

export default app;
