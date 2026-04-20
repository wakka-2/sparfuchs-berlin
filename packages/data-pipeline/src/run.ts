/**
 * Pipeline one-shot runner.
 * Usage: pnpm --filter data-pipeline run:once
 */

import { runOnce } from "./runner.js";
import { ReweSource } from "./sources/rewe.js";
import { LidlSource } from "./sources/lidl.js";
import { PennySource } from "./sources/penny.js";
import { AldiNordSource } from "./sources/aldi.js";
import { KauflandSource } from "./sources/kaufland.js";

const sources = [new ReweSource(), new LidlSource(), new PennySource(), new AldiNordSource(), new KauflandSource()];

runOnce(sources);
