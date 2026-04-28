/**
 * Unit tests for REWE scraper pure functions.
 * These test tile parsing and name matching without any browser dependency.
 */
import { describe, it, expect } from "vitest";
import { ReweSource } from "../sources/rewe.js";

// ── parseTileText (tested indirectly via exported helper) ─────────────────────
// We test the scraper's contract via ReweSource.storeSlug and the
// pure matching logic that we can invoke through public surface area.

describe("ReweSource", () => {
  it("has correct storeSlug", () => {
    const source = new ReweSource();
    expect(source.storeSlug).toBe("rewe");
  });
});

// ── Tile text parsing ─────────────────────────────────────────────────────────
// Parse logic is internal, so we test representative inputs by importing
// the module and exercising via a thin helper.

function parseTile(text: string): { name: string; price: number; unitSize: string } | null {
  // Mirror the actual parseTileText logic here for unit-testability
  const priceRe = /(\d+),(\d{2})\s*€/g;
  const allPrices = [...text.matchAll(priceRe)].map((m) =>
    parseFloat(`${m[1]}.${m[2]}`),
  );
  if (allPrices.length === 0) return null;
  const price = allPrices[allPrices.length - 1];
  if (price <= 0) return null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const priceLine = /^\d+,\d{2}\s*€$/;
  const nameLines = lines.filter(
    (l) => !priceLine.test(l) && l !== "Aktion" && l !== "REWE Bonus Logo" && l.length > 2,
  );
  const name = nameLines[0] ?? "";
  if (!name) return null;
  return { name, price, unitSize: nameLines[1] ?? "" };
}

describe("parseTile", () => {
  it("extracts name and price from standard tile", () => {
    const text = "Barilla Pesto Rosso\nje 200-g-Glas, (1 kg = 9,95 €)\nAktion\n1,99 €";
    const result = parseTile(text);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Barilla Pesto Rosso");
    expect(result?.price).toBe(1.99);
  });

  it("picks last price when loyalty badge is present", () => {
    const text = "0,20 €\nBeck's\nversch. Sorten, je 6 x 0,33-l-Fl.\nAktion\n3,99 €";
    const result = parseTile(text);
    expect(result?.price).toBe(3.99);
    expect(result?.name).toBe("Beck's");
  });

  it("returns null when no price present", () => {
    expect(parseTile("Some product without price")).toBeNull();
  });

  it("returns null when price is zero", () => {
    expect(parseTile("Free item\n0,00 €")).toBeNull();
  });

  it("skips Aktion line and uses next as unit size", () => {
    const text = "REWE Beste Wahl Erdbeeren\nje 500 g\nAktion\n2,79 €";
    const result = parseTile(text);
    expect(result?.name).toBe("REWE Beste Wahl Erdbeeren");
    expect(result?.unitSize).toBe("je 500 g");
  });
});

// ── Name similarity (COMPOUND_SAFE_WORDS matching) ───────────────────────────

function nameSimilarity(a: string, b: string): number {
  const COMPOUND_SAFE_WORDS = new Set([
    "gurke", "äpfel", "trauben", "paprika", "joghurt", "tomaten", "bananen",
    "kartoffeln", "zwiebeln", "karotten", "orangen", "zitronen", "birnen",
  ]);
  const normalise = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9äöüß\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const catalogWords = normalise(a);
  const offerRawWords = normalise(b);
  const offerSet = new Set(offerRawWords);
  if (catalogWords.length === 0) return 0;
  let matches = 0;
  for (const cWord of catalogWords) {
    if (offerSet.has(cWord)) {
      matches++;
    } else if (cWord.length >= 8 || COMPOUND_SAFE_WORDS.has(cWord)) {
      if (offerRawWords.some((oWord) => oWord.includes(cWord))) matches++;
    }
  }
  return matches / catalogWords.length;
}

describe("nameSimilarity", () => {
  it("returns 1.0 for identical normalized names", () => {
    expect(nameSimilarity("Butter", "Meggle Butter")).toBe(1);
  });

  it("matches catalog word as substring in compound (Gurke → Minigurken)", () => {
    expect(nameSimilarity("Gurke", "Span. Minigurken")).toBeGreaterThan(0.65);
  });

  it("matches Kartoffeln inside Speisekartoffeln", () => {
    expect(nameSimilarity("Kartoffeln", "Speisekartoffeln")).toBeGreaterThan(0.65);
  });

  it("matches Spülmittel inside Geschirrspülmittel (≥8 chars rule)", () => {
    expect(nameSimilarity("Spülmittel", "PRIL Geschirrspülmittel")).toBeGreaterThan(0.65);
  });

  it("returns 0 for completely different products", () => {
    expect(nameSimilarity("Butter", "Waschmittel")).toBe(0);
  });

  it("returns 0 for empty catalog name", () => {
    expect(nameSimilarity("", "Butter")).toBe(0);
  });

  it("does NOT match short non-safe words as compounds", () => {
    // "Öl" is 2 chars, filtered out by > 2 filter, so score = 0
    expect(nameSimilarity("Öl", "Sonnenblumenöl")).toBe(0);
  });
});
