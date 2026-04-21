/**
 * Vercel Serverless Function — raw Node.js handler (debug test).
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, url: req.url, ts: Date.now() }));
}
