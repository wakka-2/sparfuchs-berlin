/**
 * Vercel Serverless Function — Hono API handler.
 * Catches all /api/* requests and delegates to the Hono app.
 *
 * Runtime: nodejs20.x (set in vercel.json)
 */
import { handle } from "hono/vercel";
import app from "../apps/api/src/index.js";

export const config = {
  maxDuration: 30,
};

export default handle(app);
