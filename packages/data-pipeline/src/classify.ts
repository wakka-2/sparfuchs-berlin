/**
 * AI second opinion on matching. Claude reads each offer name once and says
 * which catalog product it is, if any. Where that disagrees with the catalog
 * rules, a review item is queued for a person. The AI never sets a price:
 * only rules and human-approved decisions do.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { CATALOG, ruleMatches } from "./catalog.js";
import { unitPrice } from "./units.js";
import type { Offer } from "./types.js";

export const MODEL = "claude-opus-5-5";
/** Below this the AI's answer is ignored — no review item either way. */
export const MIN_CONFIDENCE = 0.7;
const BATCH = 80;

export interface Label {
  product: string | null;
  confidence: number;
}

const Answer = z.object({
  items: z.array(
    z.object({
      i: z.number().int(),
      product: z.string().nullable(),
      confidence: z.number(),
    }),
  ),
});

const SYSTEM = `You classify German supermarket offers for a price-comparison site.

You get a numbered list of offers (name, sometimes a description) and a fixed list of catalog products. For each offer, decide which catalog product it IS — what a shopper looking for that product would accept as the same thing, in any brand, size or organic variant.

It is NOT the product when it is a dish, snack, spread or ready meal that contains it, a flavoured or processed variant shoppers would not substitute (chocolate milk is not Vollmilch, Kräuterbutter is not Butter, cottage cheese is not Frischkäse), a different cut or animal, a non-food item, or packaging/accessories. When unsure, answer null.

Answer for every number exactly once. "product" must be copied exactly from the catalog list, or null. "confidence" is 0 to 1.`;

/** Ask Claude about offer names it has not seen yet. Missing answers are simply absent. */
export async function classifyNames(
  client: Anthropic,
  items: Array<{ key: string; name: string; description?: string }>,
): Promise<Map<string, Label>> {
  const products = Object.keys(CATALOG);
  const catalogText = products.map((p) => `- ${p}`).join("\n");
  const out = new Map<string, Label>();

  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    const list = batch
      .map((it, i) => `${i}. ${it.name}${it.description ? ` — ${it.description.slice(0, 160)}` : ""}`)
      .join("\n");

    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The catalog part of the prompt is identical every batch — cache it.
      system: [{ type: "text", text: `${SYSTEM}\n\nCatalog products:\n${catalogText}`, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Offers:\n${list}` }],
      output_config: { effort: "low", format: betaZodOutputFormat(Answer) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      console.warn(`[classify] batch ${start / BATCH + 1}: no usable answer (${response.stop_reason})`);
      continue;
    }
    for (const a of response.parsed_output.items) {
      const it = batch[a.i];
      if (!it) continue;
      // Anything not copied exactly from the catalog counts as "none of them".
      const product = a.product && CATALOG[a.product] ? a.product : null;
      out.set(it.key, { product, confidence: Math.max(0, Math.min(1, a.confidence)) });
    }
  }
  return out;
}

export interface MatchReview {
  storeSlug: string;
  product: string;
  offer: Offer;
  reason: string;
}

/**
 * Where the AI and the rules disagree, one review item per (offer name, product):
 * - the AI says product P, no rule matches P → "maybe this is P too"
 * - a rule matches P, the AI confidently says something else → "is this really P?"
 */
export function matchReviews(
  offersByStore: Map<string, Offer[]>,
  labels: Map<string, Label>,
): MatchReview[] {
  const seen = new Set<string>();
  const reviews: MatchReview[] = [];
  const push = (r: MatchReview) => {
    const k = `${r.offer.name.toLowerCase()}|${r.product}`;
    if (!seen.has(k)) {
      seen.add(k);
      reviews.push(r);
    }
  };

  for (const [storeSlug, offers] of offersByStore) {
    for (const offer of offers) {
      const label = labels.get(offer.name.toLowerCase());
      if (!label || label.confidence < MIN_CONFIDENCE) continue;
      const rules = ruleMatches(offer);
      const pct = Math.round(label.confidence * 100);

      // Approving only helps if the offer can be priced per unit for that product.
      if (label.product && !rules.includes(label.product) && unitPrice(offer, CATALOG[label.product].unit) !== null) {
        push({ storeSlug, product: label.product, offer, reason: `KI (${pct} %): ist „${label.product}“ — keine Regel erkennt es` });
      }
      for (const product of rules) {
        if (label.product === product) continue;
        push({
          storeSlug,
          product,
          offer,
          reason: label.product
            ? `KI (${pct} %): eher „${label.product}“ als „${product}“`
            : `KI (${pct} %): kein „${product}“`,
        });
      }
    }
  }
  return reviews;
}
