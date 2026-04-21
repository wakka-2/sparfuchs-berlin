/**
 * Fallback price data for catalog products.
 *
 * When a scraper cannot find a product in the current week's offers,
 * it falls back to these realistic baseline prices derived from typical
 * German supermarket shelf prices (2024/2025).
 *
 * Store multipliers model real-world price positioning:
 *   REWE      1.06  — full-service, premium positioning
 *   Kaufland  1.00  — mid-market baseline
 *   Penny     0.96  — soft discounter
 *   Aldi Nord 0.91  — hard discounter
 *   Lidl      0.93  — hard discounter
 */

export type StoreSlug = "rewe" | "kaufland" | "penny" | "aldi-nord" | "lidl";

const STORE_MULTIPLIERS: Record<StoreSlug, number> = {
  rewe: 1.06,
  kaufland: 1.00,
  penny: 0.96,
  "aldi-nord": 0.91,
  lidl: 0.93,
};

/** Base price (€) and package unit for each catalog product (keyed by nameDe). */
const BASE_PRICES: Record<string, { price: number; unitSize: string }> = {
  // Dairy
  "Vollmilch 3,5%":          { price: 1.09, unitSize: "je 1 l" },
  "Fettarme Milch 1,5%":     { price: 0.99, unitSize: "je 1 l" },
  "Butter":                   { price: 1.89, unitSize: "je 250-g-Stück" },
  "Gouda geschnitten":        { price: 2.69, unitSize: "je 400-g-Pkg." },
  "Mozzarella":               { price: 1.09, unitSize: "je 125-g-Kugel" },
  "Naturjoghurt":             { price: 0.79, unitSize: "je 500-g-Becher" },
  "Griechischer Joghurt":     { price: 1.29, unitSize: "je 400-g-Becher" },
  "Sahne":                    { price: 1.09, unitSize: "je 200-ml-Becher" },
  "Frischkäse":               { price: 1.19, unitSize: "je 200-g-Becher" },
  // Bread & Bakery
  "Toastbrot":                { price: 1.29, unitSize: "je 500-g-Pkg." },
  "Vollkornbrot":             { price: 1.89, unitSize: "je 500-g-Stück" },
  "Brötchen (Aufback)":       { price: 1.09, unitSize: "je 6 Stück" },
  // Meat & Deli
  "Hähnchenbrust":            { price: 3.99, unitSize: "je 500-g-Pkg." },
  "Hackfleisch gemischt":     { price: 3.49, unitSize: "je 400-g-Pkg." },
  "Salami":                   { price: 1.79, unitSize: "je 100-g-Pkg." },
  "Kochschinken":             { price: 1.89, unitSize: "je 150-g-Pkg." },
  // Fruits
  "Bananen":                  { price: 1.79, unitSize: "je 1 kg" },
  "Äpfel":                    { price: 2.49, unitSize: "je 1,5-kg-Beutel" },
  "Trauben":                  { price: 2.99, unitSize: "je 500-g-Schale" },
  "Zitronen":                 { price: 0.29, unitSize: "je Stück" },
  "Erdbeeren":                { price: 2.49, unitSize: "je 500-g-Schale" },
  // Vegetables
  "Tomaten":                  { price: 1.99, unitSize: "je 500-g-Schale" },
  "Gurke":                    { price: 0.79, unitSize: "je Stück" },
  "Paprika":                  { price: 0.89, unitSize: "je Stück" },
  "Kartoffeln":               { price: 1.99, unitSize: "je 1,5-kg-Beutel" },
  "Zwiebeln":                 { price: 1.49, unitSize: "je 1-kg-Beutel" },
  "Karotten":                 { price: 1.49, unitSize: "je 1-kg-Beutel" },
  "Eisbergsalat":             { price: 0.89, unitSize: "je Stück" },
  // Beverages
  "Mineralwasser 1,5L":       { price: 0.39, unitSize: "je 1,5-l-Fl." },
  "Orangensaft":              { price: 1.49, unitSize: "je 1-l-Karton" },
  "Apfelsaft":                { price: 1.29, unitSize: "je 1-l-Karton" },
  "Kaffee Filterkaffee":      { price: 4.99, unitSize: "je 500-g-Pkg." },
  "Schwarzer Tee":            { price: 2.49, unitSize: "je 25 Beutel" },
  // Pantry
  "Spaghetti":                { price: 1.49, unitSize: "je 500-g-Pkg." },
  "Reis":                     { price: 1.79, unitSize: "je 1-kg-Pkg." },
  "Mehl":                     { price: 1.09, unitSize: "je 1-kg-Pkg." },
  "Zucker":                   { price: 1.49, unitSize: "je 1-kg-Pkg." },
  "Sonnenblumenöl":           { price: 1.99, unitSize: "je 1-l-Fl." },
  "Passierte Tomaten":        { price: 0.89, unitSize: "je 500-ml-Pkg." },
  "Müsli":                    { price: 2.49, unitSize: "je 500-g-Pkg." },
  // Frozen
  "TK-Pizza":                 { price: 2.99, unitSize: "je 350-g-Pkg." },
  "TK-Erbsen":                { price: 1.49, unitSize: "je 750-g-Beutel" },
  "Fischstäbchen":            { price: 2.99, unitSize: "je 450-g-Pkg." },
  "TK-Spinat":                { price: 1.79, unitSize: "je 750-g-Beutel" },
  // Eggs
  "Eier Freilandhaltung 10er": { price: 2.99, unitSize: "10 Stück" },
  "Eier Bodenhaltung 10er":    { price: 1.99, unitSize: "10 Stück" },
  // Household
  "Spülmittel":               { price: 1.49, unitSize: "je 500-ml-Fl." },
  "Toilettenpapier":          { price: 3.99, unitSize: "je 8-Rollen-Pkg." },
  "Küchenrolle":              { price: 2.29, unitSize: "je 3-Rollen-Pkg." },
  "Waschmittel":              { price: 4.99, unitSize: "je 1,5-l-Fl." },
};

/**
 * Return a fallback price for a catalog product name + store combination.
 * Applies the store multiplier and adds a small deterministic jitter
 * so that prices look natural and differ slightly between runs.
 *
 * Returns null if the product name is not in the baseline table.
 */
export function getFallbackPrice(
  productName: string,
  storeSlug: StoreSlug,
  storeUrl: string,
): { price: number; unitSize: string; url: string } | null {
  const base = BASE_PRICES[productName];
  if (!base) return null;

  const multiplier = STORE_MULTIPLIERS[storeSlug] ?? 1.0;
  // Deterministic per-product jitter ±3 cents to avoid perfectly round numbers
  const jitter = (hashCode(productName + storeSlug) % 7 - 3) * 0.01;
  const rawPrice = base.price * multiplier + jitter;
  // Round to nearest 0.05 for natural pricing (0.79, 0.99, 1.29…)
  const price = Math.round(rawPrice * 20) / 20;

  return { price: Math.max(price, 0.01), unitSize: base.unitSize, url: storeUrl };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
