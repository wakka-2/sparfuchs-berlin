/**
 * Pipeline one-shot runner.
 * Usage: pnpm --filter data-pipeline run:once
 */

import { runOnce } from "./runner.js";
import { ReweSource } from "./sources/rewe.js";
import { LidlSource } from "./sources/lidl.js";

const sources = [new ReweSource(), new LidlSource()];

runOnce(sources);
