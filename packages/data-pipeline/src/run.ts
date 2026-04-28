/**
 * Pipeline one-shot runner.
 * Usage: pnpm --filter data-pipeline run:once
 */

import { runOnce } from "./runner.js";
import { ReweSource } from "./sources/rewe.js";
import { PennySource } from "./sources/penny.js";
import { AldiNordSource } from "./sources/aldi.js";
import { KauflandSource } from "./sources/kaufland.js";

// Lidl removed: Lidl.de does not publish grocery prices online.
// Only sources with real scraped prices are included.
const sources = [new ReweSource(), new PennySource(), new AldiNordSource(), new KauflandSource()];

runOnce(sources);
