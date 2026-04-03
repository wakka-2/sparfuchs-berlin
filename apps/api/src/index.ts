import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import productsRoutes from "./routes/products.js";
import categoriesRoutes from "./routes/categories.js";
import storesRoutes from "./routes/stores.js";
import basketRoutes from "./routes/basket.js";
import healthRoutes from "./routes/health.js";

const app = new Hono().basePath("/api/v1");

// ── Middleware ────────────────────────────────────
app.use("*", logger());

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  }),
);

// ── Global error handler ─────────────────────────
app.onError((err, c) => {
  console.error(`[api] Unhandled error: ${err.message}`, err.stack);
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

// ── Server ───────────────────────────────────────
const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API running at http://localhost:${info.port}`);
});

export default app;
