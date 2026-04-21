/**
 * Vercel Serverless Function — Hono API handler (Node.js runtime).
 * Uses @hono/node-server/vercel which bridges IncomingMessage → Hono fetch API.
 */
import { handle } from "@hono/node-server/vercel";
import app from "../apps/api/src/app.js";

export const config = {
  maxDuration: 30,
};

export default handle(app);
