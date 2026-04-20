/**
 * Cron-based pipeline scheduler.
 * Usage: pnpm --filter @sparfuchs/data-pipeline start:cron
 *
 * Runs all stores once daily at 05:00 CET.
 * Override via env var: PIPELINE_CRON  (default: "0 5 * * *")
 *
 * On startup it also runs the pipeline immediately so prices are fresh
 * even if the service was just deployed.
 */

import cron from "node-cron";
import { runFullPipeline } from "./runner.js";
import { closeDb } from "./db.js";
import { ReweSource } from "./sources/rewe.js";
import { LidlSource } from "./sources/lidl.js";
import { PennySource } from "./sources/penny.js";
import { AldiNordSource } from "./sources/aldi.js";
import { KauflandSource } from "./sources/kaufland.js";

const CRON_SCHEDULE = process.env.PIPELINE_CRON ?? "0 5 * * *";

const sources = [
  new ReweSource(),
  new LidlSource(),
  new PennySource(),
  new AldiNordSource(),
  new KauflandSource(),
];

async function runPipeline() {
  console.log(`[scheduler] Pipeline triggered at ${new Date().toISOString()}`);
  try {
    await runFullPipeline(sources);
  } catch (err) {
    console.error("[scheduler] Pipeline error:", err instanceof Error ? err.message : String(err));
  }
}

console.log("[scheduler] Starting pipeline scheduler...");
console.log(`[scheduler] Schedule: ${CRON_SCHEDULE} (Europe/Berlin)`);
console.log(`[scheduler] Stores: ${sources.map((s) => s.storeSlug).join(", ")}`);

// Run immediately on startup so prices are populated right away
runPipeline();

// Then schedule daily at 05:00 CET
cron.schedule(CRON_SCHEDULE, runPipeline, { timezone: "Europe/Berlin" });

console.log("[scheduler] Scheduler running. Next run at 05:00 CET.");

// Keep process alive
process.on("SIGTERM", async () => {
  console.log("[scheduler] SIGTERM received — shutting down.");
  await closeDb();
  process.exit(0);
});
