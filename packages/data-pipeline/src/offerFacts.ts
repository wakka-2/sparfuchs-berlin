/**
 * Facts the browse page needs per offer, computed once in the pipeline:
 * category, price per kg / L / piece, and an exact-match key so the very same
 * branded product can be shown across stores ("auch bei Kaufland: 1,19 €").
 */
import { categorize } from "./categorize.js";
import { unitPrice, type UnitKind } from "./units.js";
import type { Offer } from "./types.js";

/** The pack text actually counts pieces ("10-Stück-Packung", "8x60 Blatt", "20 WL"). */
const COUNTS_PIECES = /stück|\bst\.?\b|\d\s*x\s*\d|\d\s*er\b|\bwl\b|blatt|rollen|anwendung/i;

export function unitFacts(offer: Offer): { kind: UnitKind; perUnit: number } | null {
  // Without a counted size, "per piece" would just repeat the pack price.
  const kinds: UnitKind[] = COUNTS_PIECES.test(`${offer.unitText} ${offer.baseText ?? ""}`) ? ["kg", "L", "Stück"] : ["kg", "L"];
  for (const kind of kinds) {
    const perUnit = unitPrice(offer, kind);
    if (perUnit !== null && perUnit > 0) return { kind, perUnit };
  }
  return null;
}

const NOISE = /\b(je|versch\.?|verschiedene|sorten|packung|packg\.?|pckg\.?|stück|st\.?)\b/g;

/**
 * Same product = same name words (brand included) and same amount. Offers for
 * several variants ("X oder Y") and names without a brand-like second word are
 * never matched — a missed match is fine, a wrong one is not.
 */
export function matchKey(offer: Offer): string | null {
  const name = offer.name.toLowerCase();
  if (/\boder\b|\//.test(name)) return null;
  const words = name
    .replace(/[®™©»«"'.,:;!()*²]/g, " ")
    .replace(NOISE, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 2) return null;
  const facts = unitFacts(offer);
  if (!facts) return null;
  const amount = offer.price / facts.perUnit; // kg, L or pieces in the pack
  if (!(amount > 0)) return null;
  return `${[...new Set(words)].sort().join(" ")}|${facts.kind}|${amount.toFixed(3)}`;
}

export function offerFacts(offer: Offer) {
  const facts = unitFacts(offer);
  return {
    category: offer.category ?? categorize(offer.name),
    unitPriceCents: facts ? Math.round(facts.perUnit * 100) : null,
    unitKind: facts?.kind ?? null,
    matchKey: matchKey(offer),
  };
}
