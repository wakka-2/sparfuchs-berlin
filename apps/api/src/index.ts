import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import productsRoutes from "./routes/products.js";
import categoriesRoutes from "./routes/categories.js";
import storesRoutes from "./routes/stores.js";
import basketRoutes from "./routes/basket.js";
import healthRoutes from "./routes/health.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { closeCache } from "./lib/cache.js";

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

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] Server running at http://localhost:${info.port}`);
  console.log(`[api] Environment: ${process.env.NODE_ENV ?? "development"}`);
});

// ── Graceful shutdown ─────────────────────────────
async function shutdown(signal: string) {
  console.log(`[api] Received ${signal} — shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log("[api] HTTP server closed.");

    // Close Redis connection
    await closeCache();
    console.log("[api] Cache connection closed.");

    console.log("[api] Shutdown complete.");
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error("[api] Graceful shutdown timed out — forcing exit.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
