/**
 * Vercel Serverless Function — Hono API handler.
 * Catches all /api/* requests and delegates to the Hono app.
 */
import { Hono } from "hono";
import { handle } from "hono/vercel";
import app from "../apps/api/src/app.js";

// Tiny inline ping so we can diagnose load vs DB issues
const wrapper = new Hono();
wrapper.get("/api/ping", (c) => c.json({ ok: true, ts: Date.now() }));
wrapper.route("/", app);

export const config = {
  maxDuration: 30,
};

export default handle(wrapper);
