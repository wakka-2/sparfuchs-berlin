/**
 * Shared catalog-to-offer name matching.
 *
 * Every store scraper matches its scraped offer names against the same product
 * catalog, so the matching rules live here rather than being copy-pasted per
 * scraper. (They previously were: "eier" was missing from COMPOUND_SAFE_WORDS
 * in all four copies, which made every egg product unmatchable everywhere.)
 */

/**
 * Short catalog words that are safe to match inside a larger German compound.
 *
 * Words of 8+ characters are compound-matched automatically — they are
 * specific enough that a substring hit is almost certainly the same product
 * ("spülmittel" inside "geschirrspülmittel"). Shorter words need to be
 * allow-listed individually, because a blanket substring rule on 3-4 letter
 * words matches far too much.
 */
export const COMPOUND_SAFE_WORDS = new Set([
  "gurke", "äpfel", "trauben", "paprika", "joghurt", "tomaten", "bananen",
  "kartoffeln", "zwiebeln", "karotten", "orangen", "zitronen", "birnen",
  "eier",
]);

/**
 * Offers that contain a catalog word but are a different product entirely.
 *
 * Compound matching is deliberately permissive, which makes it prone to
 * "false friends": "Eier" legitimately matches "Körndleier" (eggs) but must
 * not match "Eierlikör" (egg liqueur) or "Eiernudeln" (egg noodles). When a
 * catalog word appears here, an offer matching the pattern is rejected.
 */
const FALSE_FRIENDS: Array<{ catalogWord: string; offerPattern: RegExp }> = [
  {
    catalogWord: "eier",
    // egg liqueur / noodles / salad / cups / cookers / slicers / colouring kits
    offerPattern: /eier(likör|nudeln|salat|becher|kocher|schneider|farb)/i,
  },
];

function normalise(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Fraction of the catalog product's words that appear in the offer name.
 *
 * Scoring against the *catalog* name (not the offer name) is what stops a
 * single shared word — "Kaffee" in "Kaffeefilter" — from matching unrelated
 * offers: every word of the catalog entry has to be accounted for.
 */
export function nameSimilarity(catalogName: string, offerName: string): number {
  const catalogWords = normalise(catalogName);
  const offerRawWords = normalise(offerName);
  const offerSet = new Set(offerRawWords);
  if (catalogWords.length === 0) return 0;

  let matches = 0;
  for (const cWord of catalogWords) {
    if (offerSet.has(cWord)) {
      matches++;
    } else if (cWord.length >= 8 || COMPOUND_SAFE_WORDS.has(cWord)) {
      // German compound words: "gurke" inside "minigurken"
      if (offerRawWords.some((oWord) => oWord.includes(cWord))) matches++;
    }
  }
  return matches / catalogWords.length;
}

/**
 * True when the catalog word appears in the offer only as an ingredient
 * (after "mit" or "aus"), not as the product itself.
 * E.g. "Champignons mit Frischkäse" → Frischkäse is an ingredient.
 */
export function isIngredientOnly(offerName: string, catalogName: string): boolean {
  const n = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9äöüß\s]/g, " ").replace(/\s+/g, " ").trim();
  return new RegExp(`\\b(mit|aus)\\b.*\\b${n(catalogName)}\\b`).test(n(offerName));
}

/** True when the offer is a known false friend of one of the catalog's words. */
export function isFalseFriend(offerName: string, catalogName: string): boolean {
  const catalogWords = new Set(normalise(catalogName));
  return FALSE_FRIENDS.some(
    ({ catalogWord, offerPattern }) =>
      catalogWords.has(catalogWord) && offerPattern.test(offerName),
  );
}

/** Minimum share of catalog words that must appear in the offer name. */
export const OFFER_MATCH_THRESHOLD = 0.65;
/** Catalog search results are already query-scoped, so they can match looser. */
export const CATALOG_MATCH_THRESHOLD = 0.5;

/**
 * Pick the best-scoring offer for a catalog product name, or null when nothing
 * clears `threshold`.
 */
export function bestMatch<T extends { name: string }>(
  productName: string,
  offers: T[],
  threshold: number = OFFER_MATCH_THRESHOLD,
): T | null {
  let best: T | null = null;
  let bestScore = threshold;

  for (const offer of offers) {
    if (isIngredientOnly(offer.name, productName)) continue;
    if (isFalseFriend(offer.name, productName)) continue;
    const score = nameSimilarity(productName, offer.name);
    if (score > bestScore) {
      bestScore = score;
      best = offer;
    }
  }
  return best;
}
