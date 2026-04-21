/**
 * Vercel Serverless Function — debug handler.
 */
import { handle } from "@hono/node-server/vercel";
import { Hono } from "hono";

// Debug app: catch-all route that returns request info
const debugApp = new Hono();
debugApp.all("*", (c) => {
  return c.json({
    path: new URL(c.req.url).pathname,
    fullUrl: c.req.url,
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
  });
});

export const config = {
  maxDuration: 30,
};

export default handle(debugApp);
