/**
 * Vercel Serverless Function — Hono API handler.
 * Catches all /api/* requests and delegates to the Hono app.
 */
import { Hono } from "hono";
import { handle } from "hono/vercel";

// Test: completely self-contained, no DB imports
const app = new Hono();
app.get("/api/ping", (c) => c.json({ ok: true, ts: Date.now() }));

export const config = {
  maxDuration: 30,
};

export default handle(app);
