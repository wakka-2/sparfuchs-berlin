import { serve } from "@hono/node-server";
import app from "./app.js";
import { closeCache } from "./lib/cache.js";
import { initMonitoring } from "./lib/monitoring.js";

// ── Server ───────────────────────────────────────
const port = Number(process.env.PORT) || 3001;

// Initialize monitoring before starting the server (async, non-blocking)
initMonitoring().catch((err) => console.warn("[api] Monitoring init failed:", err));

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
