import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono().basePath("/api/v1");

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  }),
);

// Health check
app.get("/health", (c) => {
  return c.json({
    success: true,
    data: {
      status: "healthy",
      version: "0.0.1",
      timestamp: new Date().toISOString(),
    },
  });
});

// Placeholder routes (will be implemented in Stage 4)
app.get("/products", (c) => {
  return c.json({ success: true, data: { products: [] }, meta: { pagination: { page: 1, limit: 20, total_items: 0, total_pages: 0 } } });
});

app.get("/categories", (c) => {
  return c.json({ success: true, data: { categories: [] } });
});

app.get("/stores", (c) => {
  return c.json({ success: true, data: { stores: [] } });
});

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API running at http://localhost:${info.port}`);
});

export default app;
