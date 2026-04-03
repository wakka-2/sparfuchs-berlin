import { Hono } from "hono";
import { getHealthStatus } from "../services/health.service.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const status = await getHealthStatus();
    return c.json({ success: true, data: status });
  } catch {
    return c.json(
      {
        success: true,
        data: {
          status: "degraded",
          version: "1.0.0",
          database: "disconnected",
        },
      },
      503,
    );
  }
});

export default app;
