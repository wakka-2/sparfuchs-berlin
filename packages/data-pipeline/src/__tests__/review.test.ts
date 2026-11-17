import { describe, it, expect } from "vitest";
import { rankOffers, priceProblem, CATALOG } from "../catalog.js";
import { matchReviews, classifyNames, MODEL, type Label } from "../classify.js";
import type Anthropic from "@anthropic-ai/sdk";
import type { Offer } from "../types.js";

const offer = (name: string, price: number, unitText: string, baseText?: string): Offer => ({ name, price, unitText, baseText });

describe("priceProblem", () => {
  it("accepts a normal price", () => {
    expect(priceProblem("Butter", 5.16)).toBeNull();
  });

  it("holds a unit price outside the product's plausible range", () => {
    expect(priceProblem("Sahne", 0.4)).toMatch(/außerhalb von 2,00–8,00 €\/L/);
    expect(priceProblem("Eier", 1.5)).toMatch(/außerhalb/);
    expect(priceProblem("Sahne", 9.16)).toMatch(/außerhalb/); // spray cream in a can
  });

  it("holds a jump of more than 3x against last week's price", () => {
    expect(priceProblem("Butter", 15.9, 5.16)).toMatch(/Faktor 3/);
    expect(priceProblem("Butter", 6.0, 5.16)).toBeNull();
  });

  it("gives every catalog product a sane range", () => {
    for (const [name, rule] of Object.entries(CATALOG)) {
      expect(rule.range[0], name).toBeGreaterThan(0);
      expect(rule.range[1], name).toBeGreaterThan(rule.range[0]);
    }
  });
});

describe("rankOffers with review decisions", () => {
  const plain = offer("MILSANI Deutsche Markenbutter", 1.15, "250-g-Packung", "1 kg = 4.60");
  const odd = offer("WEIDEGLÜCK Streichzart", 1.39, "250-g-Packung", "1 kg = 5.56");

  it("ranks matches cheapest per unit first", () => {
    const ranked = rankOffers([offer("LANDLIEBE Butter", 1.99, "250-g-Packung"), plain]);
    expect(ranked.get("Butter")!.map((c) => c.offer.name)).toEqual(["MILSANI Deutsche Markenbutter", "LANDLIEBE Butter"]);
  });

  it("adds offers a person approved and drops ones they rejected", () => {
    const decisions = {
      approved: new Map([["weideglück streichzart", new Set(["Butter"])]]),
      rejected: new Map([["milsani deutsche markenbutter", new Set(["Butter"])]]),
    };
    const ranked = rankOffers([plain, odd], CATALOG, decisions);
    expect(ranked.get("Butter")!.map((c) => c.offer.name)).toEqual(["WEIDEGLÜCK Streichzart"]);
  });

  it("ignores an approval for a product that is not in the catalog", () => {
    const decisions = { approved: new Map([["weideglück streichzart", new Set(["Margarine"])]]), rejected: new Map() };
    expect(rankOffers([odd], CATALOG, decisions).size).toBe(0);
  });
});

describe("matchReviews (AI vs rules)", () => {
  const labels = (entries: Array<[string, Label]>) => new Map(entries);

  it("suggests a product the rules miss", () => {
    const o = offer("WEIDEGLÜCK Streichzart", 1.39, "250-g-Packung", "1 kg = 5.56");
    const r = matchReviews(new Map([["aldi-nord", [o]]]), labels([["weideglück streichzart", { product: "Butter", confidence: 0.9 }]]));
    expect(r).toEqual([expect.objectContaining({ storeSlug: "aldi-nord", product: "Butter", reason: expect.stringMatching(/keine Regel/) })]);
  });

  it("questions a rule match the AI confidently disagrees with", () => {
    const o = offer("LANDLIEBE Butter", 1.99, "250-g-Packung");
    const r = matchReviews(new Map([["rewe", [o]]]), labels([["landliebe butter", { product: null, confidence: 0.95 }]]));
    expect(r).toEqual([expect.objectContaining({ product: "Butter", reason: expect.stringMatching(/kein „Butter“/) })]);
  });

  it("stays quiet when AI and rules agree, or the AI is unsure", () => {
    const o = offer("LANDLIEBE Butter", 1.99, "250-g-Packung");
    expect(matchReviews(new Map([["rewe", [o]]]), labels([["landliebe butter", { product: "Butter", confidence: 0.99 }]]))).toEqual([]);
    expect(matchReviews(new Map([["rewe", [o]]]), labels([["landliebe butter", { product: null, confidence: 0.5 }]]))).toEqual([]);
  });

  it("asks once per name and product, even when several stores sell it", () => {
    const o = offer("Bananen", 1.99, "je kg");
    const l = labels([["bananen", { product: null, confidence: 0.9 }]]);
    expect(matchReviews(new Map([["rewe", [o]], ["penny", [o]]]), l)).toHaveLength(1);
  });

  it("does not suggest a product the offer cannot be priced as", () => {
    const o = offer("Mystery Box", 4.99, "je Packung");
    expect(matchReviews(new Map([["rewe", [o]]]), labels([["mystery box", { product: "Butter", confidence: 0.9 }]]))).toEqual([]);
  });
});

describe("classifyNames", () => {
  const stub = (responses: Array<{ stop_reason: string; parsed_output: unknown }>) => {
    const calls: Array<Record<string, unknown>> = [];
    const client = { beta: { messages: { parse: async (p: Record<string, unknown>) => { calls.push(p); return responses.shift(); } } } };
    return { client: client as unknown as Anthropic, calls };
  };
  const items = [
    { key: "landliebe butter", name: "LANDLIEBE Butter" },
    { key: "milka", name: "Milka Schokolade" },
    { key: "weird", name: "Something" },
  ];

  it("keeps only answers naming a real catalog product, clamps confidence", async () => {
    const { client, calls } = stub([{
      stop_reason: "end_turn",
      parsed_output: { items: [
        { i: 0, product: "Butter", confidence: 1.4 },
        { i: 1, product: null, confidence: 0.9 },
        { i: 2, product: "Margarine", confidence: 0.8 }, // not in the catalog
        { i: 9, product: "Butter", confidence: 0.9 },    // no such item
      ] },
    }]);
    const out = await classifyNames(client, items);
    expect(out.get("landliebe butter")).toEqual({ product: "Butter", confidence: 1 });
    expect(out.get("milka")).toEqual({ product: null, confidence: 0.9 });
    expect(out.get("weird")).toEqual({ product: null, confidence: 0.8 });
    expect(out.size).toBe(3);
    expect(calls[0]).toMatchObject({ model: MODEL, fallbacks: "default" });
  });

  it("skips a refused batch instead of failing", async () => {
    const { client } = stub([{ stop_reason: "refusal", parsed_output: null }]);
    expect((await classifyNames(client, items)).size).toBe(0);
  });
});
