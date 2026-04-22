import type { RawProductData, NormalizedPrice } from "../types.js";

/** Parse a unit size string into a numeric value and unit type */
export function parseUnitSize(raw: string): { value: number; unit: string } | null {
  if (!raw || raw.trim() === "") return null;

  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/,/g, ".") // German decimal: 1,5 → 1.5
    .replace(/\s+/g, " ");

  // Patterns: "500g", "1.5L", "1,5 L", "10 Stück", "200ml", "1kg", "0.5l"
  const match = cleaned.match(
    /^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|stück|stk|packung|pack|rollen|blatt|tabs|wl)$/,
  );

  if (match) {
    const value = parseFloat(match[1]);
    const rawUnit = match[2];

    // Normalize unit names
    const unitMap: Record<string, string> = {
      kg: "kg",
      g: "g",
      l: "L",
      ml: "ml",
      stück: "Stück",
      stk: "Stück",
      packung: "Packung",
      pack: "Packung",
      rollen: "Stück",
      blatt: "Stück",
      tabs: "Stück",
      wl: "WL",
    };

    return { value, unit: unitMap[rawUnit] ?? rawUnit };
  }

  // Try pattern: "10er" (e.g., "10er Pack Eier")
  const countMatch = cleaned.match(/^(\d+)\s*er/);
  if (countMatch) {
    return { value: parseInt(countMatch[1], 10), unit: "Stück" };
  }

  // Try pattern: "1 Liter", "500 Gramm"
  const longMatch = cleaned.match(
    /^(\d+(?:\.\d+)?)\s*(liter|gramm|kilogramm|milliliter)/,
  );
  if (longMatch) {
    const value = parseFloat(longMatch[1]);
    const longUnit = longMatch[2];
    const longMap: Record<string, string> = {
      liter: "L",
      gramm: "g",
      kilogramm: "kg",
      milliliter: "ml",
    };
    return { value, unit: longMap[longUnit] ?? longUnit };
  }

  return null;
}

/** Convert any unit to its base unit (g→kg, ml→L) and return per-base-unit price in cents */
export function calculateUnitPriceCents(
  priceCents: number,
  unitValue: number,
  unitType: string,
): number {
  if (unitValue <= 0) return priceCents;

  switch (unitType) {
    case "kg":
      // Price per kg
      return Math.round(priceCents / unitValue);
    case "g":
      // Convert to per-kg: price / (grams / 1000)
      return Math.round((priceCents / unitValue) * 1000);
    case "L":
      // Price per liter
      return Math.round(priceCents / unitValue);
    case "ml":
      // Convert to per-liter: price / (ml / 1000)
      return Math.round((priceCents / unitValue) * 1000);
    case "Stück":
    case "Packung":
      // Price per unit
      return Math.round(priceCents / unitValue);
    default:
      return priceCents;
  }
}

/** Determine the display unit type for unit price (kg, L, or Stück) */
export function getDisplayUnitType(unitType: string): string {
  switch (unitType) {
    case "kg":
    case "g":
      return "kg";
    case "L":
    case "ml":
      return "L";
    default:
      return unitType;
  }
}

/** Clean product name: strip HTML, normalize whitespace */
export function cleanProductName(name: string): string {
  return name
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/** Convert euro price to cents */
export function euroToCents(price: number): number {
  return Math.round(price * 100);
}

/** Normalize raw product data into a DB-ready price record */
export function normalizePrice(
  raw: RawProductData,
  productMatchId: string,
  defaultUnit: string,
): NormalizedPrice | null {
  const priceCents = euroToCents(raw.price);

  if (priceCents <= 0) {
    console.warn(`[normalizer] Skipping "${raw.name}": price is ${raw.price} (${priceCents} cents)`);
    return null;
  }

  // Parse unit size from raw data
  let parsed = parseUnitSize(raw.unitSize);

  // If we can't parse, use defaults based on product's default unit
  if (!parsed) {
    parsed = { value: 1, unit: defaultUnit };
  }

  const unitPriceCents = calculateUnitPriceCents(priceCents, parsed.value, parsed.unit);
  const displayUnitType = getDisplayUnitType(parsed.unit);

  return {
    productMatchId,
    priceCents,
    unitSize: (raw.unitSize || `1${defaultUnit}`).slice(0, 50),
    unitType: displayUnitType,
    unitPriceCents,
  };
}
