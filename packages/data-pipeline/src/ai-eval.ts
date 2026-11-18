/**
 * Measure the AI classifier's accuracy on the hand-checked test set
 * (src/eval/gold.ts). Costs about 0,04 $ per run. Usage: pnpm ai:eval
 */
import Anthropic from "@anthropic-ai/sdk";
import { classifyNames } from "./classify.js";
import { GOLD } from "./eval/gold.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}
const items = GOLD.map((g, i) => ({ key: String(i), name: g.name }));
const labels = await classifyNames(new Anthropic(), items);
let right = 0, unsure = 0;
for (const [i, g] of GOLD.entries()) {
  const l = labels.get(String(i));
  if (!l || l.confidence < 0.7) { unsure++; continue; }
  if (l.product === g.product) right++;
  else console.log(`WRONG: "${g.name}" → AI "${l.product ?? "none"}" (${Math.round(l.confidence * 100)} %), correct "${g.product ?? "none"}"`);
}
const answered = GOLD.length - unsure;
console.log(`AI accuracy: ${right}/${answered} confident answers right (${Math.round((100 * right) / answered)} %), ${unsure} unsure of ${GOLD.length}`);
