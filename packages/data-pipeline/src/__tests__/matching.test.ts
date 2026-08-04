/**
 * Tests for the shared catalog↔offer matching rules.
 *
 * These import the real implementation rather than mirroring it — the "eier"
 * bug survived precisely because the logic was duplicated per scraper and the
 * test file kept its own private copy.
 */
import { describe, it, expect } from "vitest";
import {
  COMPOUND_SAFE_WORDS,
  nameSimilarity,
  isIngredientOnly,
  isFalseFriend,
  bestMatch,
  OFFER_MATCH_THRESHOLD,
} from "../matching.js";

describe("nameSimilarity", () => {
  it("returns 1.0 when every catalog word appears in the offer", () => {
    expect(nameSimilarity("Butter", "Meggle Butter")).toBe(1);
  });

  it("matches a short allow-listed word inside a compound (Gurke → Minigurken)", () => {
    expect(nameSimilarity("Gurke", "Span. Minigurken")).toBeGreaterThan(OFFER_MATCH_THRESHOLD);
  });

  it("matches an 8+ char word inside a compound without an allow-list entry", () => {
    expect(nameSimilarity("Spülmittel", "PRIL Geschirrspülmittel")).toBeGreaterThan(
      OFFER_MATCH_THRESHOLD,
    );
  });

  it("scores 0 for unrelated products", () => {
    expect(nameSimilarity("Butter", "Waschmittel")).toBe(0);
  });

  it("scores 0 for an empty catalog name", () => {
    expect(nameSimilarity("", "Butter")).toBe(0);
  });

  it("does not compound-match a short word that is not allow-listed", () => {
    // "Öl" is 2 chars and filtered out entirely by the >2 length rule
    expect(nameSimilarity("Öl", "Sonnenblumenöl")).toBe(0);
  });

  // ── Regression: eggs were unmatchable at every store ──────────────────────
  it("matches Eier inside a German compound offer name", () => {
    // "eier" is only 4 chars, so it needs an explicit allow-list entry
    expect(COMPOUND_SAFE_WORDS.has("eier")).toBe(true);
    expect(nameSimilarity("Eier", "SONNENDORFER Körndleier")).toBe(1);
  });

  it("scores over-specified catalog names below threshold", () => {
    // Documents WHY the catalog entry was consolidated to plain "Eier":
    // flyer names carry neither the husbandry nor the pack-size qualifier.
    expect(nameSimilarity("Eier Freilandhaltung 10er", "SONNENDORFER Körndleier")).toBeLessThan(
      OFFER_MATCH_THRESHOLD,
    );
  });
});

describe("isIngredientOnly", () => {
  it("rejects an offer where the catalog word is only an ingredient", () => {
    expect(isIngredientOnly("Gegrillte Champignons mit Frischkäse", "Frischkäse")).toBe(true);
  });

  it("accepts an offer where the catalog word is the product", () => {
    expect(isIngredientOnly("Exquisa Frischkäse", "Frischkäse")).toBe(false);
  });
});

describe("isFalseFriend", () => {
  it.each([
    ["Verpoorten Eierlikör", "egg liqueur"],
    ["Birkel Eiernudeln", "egg noodles"],
    ["Popp Eiersalat", "egg salad"],
  ])("rejects %s as a match for Eier (%s)", (offer) => {
    expect(isFalseFriend(offer, "Eier")).toBe(true);
  });

  it("allows a genuine egg offer", () => {
    expect(isFalseFriend("SONNENDORFER Körndleier", "Eier")).toBe(false);
  });

  it("only applies to catalog names containing the trigger word", () => {
    expect(isFalseFriend("Verpoorten Eierlikör", "Butter")).toBe(false);
  });
});

describe("bestMatch", () => {
  const offers = [
    { name: "Verpoorten Eierlikör", price: 9.99 },
    { name: "SONNENDORFER Körndleier", price: 3.59 },
    { name: "Meggle Butter", price: 2.49 },
  ];

  it("picks the genuine egg offer and skips the false friend", () => {
    expect(bestMatch("Eier", offers)?.name).toBe("SONNENDORFER Körndleier");
  });

  it("returns null when nothing clears the threshold", () => {
    expect(bestMatch("Toilettenpapier", offers)).toBeNull();
  });

  it("honours a custom (looser) threshold", () => {
    // "Griechischer Joghurt" vs "Milbona Joghurt" → 1 of 2 catalog words = 0.5:
    // above the catalog-search threshold, below the stricter offer threshold.
    const partial = [{ name: "Milbona Joghurt", price: 1.29 }];
    expect(nameSimilarity("Griechischer Joghurt", "Milbona Joghurt")).toBe(0.5);
    expect(bestMatch("Griechischer Joghurt", partial, 0.4)?.name).toBe("Milbona Joghurt");
    expect(bestMatch("Griechischer Joghurt", partial)).toBeNull();
  });
});
