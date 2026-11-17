import { describe, it, expect } from "vitest";
import { bestOffers } from "../catalog.js";
import type { Offer } from "../types.js";

const offer = (name: string, price: number, unitText: string, baseText?: string): Offer => ({
  name, price, unitText, baseText,
});

const matched = (o: Offer) => [...bestOffers([o]).keys()];

describe("catalog rules", () => {
  // Real offers the old fuzzy matcher filed under the wrong product.
  it.each([
    ["ESMARA® Damen-Spaghettiträgerhemden", 7.99, "je Stück"],
    ["Zentis Erdbeer Konfitüre extra", 2.49, "je 335-g-Glas"],
    ["K-CLASSIC Tomatenmark", 2.31, "je 200-g-Tube"],
    ["Karotten-Krüstchen", 0.33, "je Stück"],
    ["K-WINTER EDITION Marzipankartoffeln", 1.19, "je 125-g-Packg."],
    ["SARTORI BellaVitano Espresso", 2.99, "je 100 g"],
    ["KLOSTERFRAU Heiße Zitrone-Echinacea", 2.99, "je 48 g"],
    ["K-WINTER EDITION Eierlikörfässchen", 3.99, "je 200-g-Packg."],
    ["Wagner Big City Salami", 1.99, "je 415-g-Pckg."],
  ])("does not file %s under a staple it merely mentions", (name, price, unit) => {
    expect(matched(offer(name, price, unit))).toEqual([]);
  });

  it("does not read 'Bachmeier' as eggs", () => {
    expect(matched(offer("BACHMEIER Orig. bayr. Laugenbrezen", 1.99, "je 8 St."))).not.toContain("Eier");
  });

  it.each([
    ["Butter", "LANDLIEBE Butter", 1.39, "250-g-Packung", "1 kg = 5.56"],
    ["Eier", "SONNENDORFER Körndleier", 3.59, "je 10 Stück", undefined],
    ["Eier", "Eier aus Bodenhaltung", 1.99, "je 10 St.", undefined],
    ["Bananen", "Bananen", 0.99, "kg-Preis", "1 kg = 0.99"],
    ["Vollmilch 3,5%", "WEIHENSTEPHAN Frische Vollmilch", 0.99, "je 1-l-Packg.", undefined],
    ["Kaffee Filterkaffee", "Jacobs Krönung", 5.79, "je 500-g-Pckg.", "(1 kg = 11,58 €)"],
    ["Hackfleisch gemischt", "Gemischtes Hackfleisch XXL", 4.99, "800-g-Packung", "1 kg = 6.24"],
  ])("files a real %s offer correctly", (product, name, price, unit, base) => {
    expect(matched(offer(name, price, unit, base))).toContain(product);
  });

  it("picks the best value per kg, not the cheapest pack", () => {
    const best = bestOffers([
      offer("KERRYGOLD Butter", 1.59, "je 250 g", "(1 kg = 6.36)"),
      offer("LANDLIEBE Butter", 2.49, "je 500 g", "(1 kg = 4.98)"),
    ]);
    expect(best.get("Butter")?.offer.name).toBe("LANDLIEBE Butter");
    expect(best.get("Butter")?.unitPrice).toBeCloseTo(4.98);
  });

  it("leaves out an offer that cannot be priced per unit", () => {
    expect(bestOffers([offer("WEIHENSTEPHAN Milch", 0.99, "je Packung")]).size).toBe(0);
  });
});
