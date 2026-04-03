/**
 * Cron-based pipeline scheduler.
 * Usage: pnpm --filter data-pipeline start:cron
 *
 * Default schedule:
 *   REWE: 05:00 CET daily
 *   Lidl: 05:30 CET daily
 *
 * Override via env vars: PIPELINE_CRON_REWE, PIPELINE_CRON_LIDL
 */

import cron from "node-cron";
import { runPipelineForStore } from "./runner.js";
import { ReweSource } from "./sources/rewe.js";
import { LidlSource } from "./sources/lidl.js";

const REWE_CRON = process.env.PIPELINE_CRON_REWE ?? "0 5 * * *";
const LIDL_CRON = process.env.PIPELINE_CRON_LIDL ?? "30 5 * * *";

const reweSource = new ReweSource();
const lidlSource = new LidlSource();

console.log("[scheduler] Starting pipeline scheduler...");
console.log(`[scheduler] REWE schedule: ${REWE_CRON}`);
console.log(`[scheduler] Lidl schedule: ${LIDL_CRON}`);

cron.schedule(
  REWE_CRON,
  async () => {
    console.log(`[scheduler] REWE pipeline triggered at ${new Date().toISOString()}`);
    await runPipelineForStore(reweSource);
  },
  { timezone: "Europe/Berlin" },
);

cron.schedule(
  LIDL_CRON,
  async () => {
    console.log(`[scheduler] Lidl pipeline triggered at ${new Date().toISOString()}`);
    await runPipelineForStore(lidlSource);
  },
  { timezone: "Europe/Berlin" },
);

console.log("[scheduler] Scheduler running. Waiting for next cron trigger...");
