import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { stores, pipelineRuns } from "../db/schema.js";
import { isCacheConnected } from "../lib/cache.js";

export async function getHealthStatus() {
  const storeRows = await db.select().from(stores).where(eq(stores.isActive, true));

  const storeStatus: Record<
    string,
    {
      last_pipeline_run: string | null;
      status: string;
      products_updated: number;
      data_age_hours: number | null;
    }
  > = {};

  for (const store of storeRows) {
    const [lastRun] = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.storeId, store.id))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(1);

    if (lastRun) {
      const ageMs = Date.now() - (lastRun.completedAt ?? lastRun.startedAt).getTime();
      storeStatus[store.slug] = {
        last_pipeline_run: (lastRun.completedAt ?? lastRun.startedAt).toISOString(),
        status: lastRun.status,
        products_updated: lastRun.productsUpdated,
        data_age_hours: Math.round((ageMs / 3600000) * 10) / 10,
      };
    } else {
      storeStatus[store.slug] = {
        last_pipeline_run: null,
        status: "never_run",
        products_updated: 0,
        data_age_hours: null,
      };
    }
  }

  return {
    status: "healthy",
    version: "1.0.0",
    stores: storeStatus,
    database: "connected",
    cache: isCacheConnected() ? "connected" : "unavailable",
    uptime_seconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? "development",
  };
}
