/**
 * Unit prices — what makes offers from different stores comparable.
 *
 * A 250 g pack for 1,39 € and a 500 g pack for 2,49 € can only be compared per
 * kilogram. Stores print that base price themselves ("1 kg = 5.56"), so we
 * take theirs when present and only compute from the pack size as a fallback.
 */
import type { Offer } from "./types.js";

export type UnitKind = "kg" | "L" | "Stück";

const NUM = String.raw`\d+(?:[.,]\d+)*`;
// "i" covers Penny printing litres as a capital I ("0,2 I").
const UNIT = "kg|g|ml|liter|l|i";

/** "1,5" → 1.5, "1.000" → 1000, "6.36" → 6.36 */
function num(s: string): number {
  return parseFloat(s.replace(/\.(?=\d{3}(?!\d))/g, "").replace(",", "."));
}

/** How many kg / L one `qty unit` is, or null when the unit is the other dimension. */
function inBase(qty: number, unit: string, kind: UnitKind): number | null {
  const u = unit.toLowerCase();
  if (kind === "kg") return u === "kg" ? qty : u === "g" ? qty / 1000 : null;
  if (kind === "L") return u === "l" || u === "i" || u === "liter" ? qty : u === "ml" ? qty / 1000 : null;
  return null;
}

/** Euros per kg / L / piece for an offer, or null when it cannot be known. */
export function unitPrice(
  offer: Pick<Offer, "price" | "unitText" | "baseText">,
  kind: UnitKind,
): number | null {
  const text = `${offer.baseText ?? ""} ${offer.unitText}`;

  if (kind === "Stück") {
    // The store's own per-piece price: "(pro Anwendung = 0.08)", "(1 WL = 0,25 €)"
    const per = text.match(new RegExp(`(?:pro|1)\\s*(?:stück|anwendung|wl|waschladung)\\s*=\\s*(${NUM})`, "i"));
    if (per) return num(per[1]);
    // A weight or volume without a piece count is a pack, not a piece.
    // "32x200-Blatt": x directly followed by a digit is still a multiplier.
    const count = text.match(/(\d+)\s*(?:x(?![a-zäöü])|er\b|-?\s*st(?:ü?c?k)?\b\.?|\s*rollen\b|\s*wl\b|\s*waschladungen\b)/i);
    if (count) return offer.price / parseInt(count[1], 10);
    if (new RegExp(`\\d\\s*-?\\s*(?:${UNIT})\\b`, "i").test(text)) return null;
    return offer.price;
  }

  // 1. The store's own base price: "1 kg = 8.80 - 10.36", "100 g = 1,20 €"
  const base = text.match(
    new RegExp(`(${NUM})\\s*-?\\s*(${UNIT})\\s*(?:\\(ATG\\)\\s*)?=\\s*(${NUM})(?:\\s*[-–]\\s*(${NUM}))?`, "i"),
  );
  if (base) {
    const per = inBase(num(base[1]), base[2], kind);
    if (per === null) return null;
    // A range means several pack sizes share one price — quote the dearer end.
    return Math.max(num(base[3]), base[4] ? num(base[4]) : 0) / per;
  }

  // 2. Pack size: "6 x 1,5-l", "je 250 g", "85 - 100-g-Tafel" (smaller size = dearer end)
  const size = offer.unitText.match(
    new RegExp(`(?:(\\d+)\\s*x\\s*)?(${NUM})(?:\\s*[-–]\\s*${NUM})?\\s*-?\\s*(${UNIT})\\b`, "i"),
  );
  if (size) {
    const per = inBase(num(size[2]) * (size[1] ? parseInt(size[1], 10) : 1), size[3], kind);
    return per ? offer.price / per : null;
  }

  // 3. Sold by weight / volume: "je kg", "kg-Preis"
  const loose = offer.unitText.match(/(?:^|\s)(kg|l)(?:-preis)?\b/i);
  if (loose && inBase(1, loose[1], kind)) return offer.price;

  return null;
}
