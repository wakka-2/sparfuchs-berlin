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
    ["K-CLASSIC Tomatenmark", 2.31, "je 200-g-Tube"],
    ["Karotten-Krüstchen", 0.33, "je Stück"],
    ["K-WINTER EDITION Marzipankartoffeln", 1.19, "je 125-g-Packg."],
    ["SARTORI BellaVitano Espresso", 2.99, "je 100 g"],
    ["KLOSTERFRAU Heiße Zitrone-Echinacea", 2.99, "je 48 g"],
    ["K-WINTER EDITION Eierlikörfässchen", 3.99, "je 200-g-Packg."],
    ["Wagner Big City Salami", 1.99, "je 415-g-Pckg."],
    ["LANDFREUDE Gefärbte Eier aus Bodenhaltung", 2.99, "10-Stück-Packung"],
    ["MEINE METZGEREI Paprika-Schinkengeschnetzeltes", 3.49, "500-g-Packung"],
    ["KIRI Mit Sahne", 2.79, "je 10 St. = 180-g-Packg."],
    ["WONNEMEYER Kirschpaprika-Variation", 1.99, "150-g-Packung"],
    ["MILSANI High-Protein Körniger Frischkäse", 1.98, "4x125-g-Packung"],
    ["GOURMET FINEST CUISINE Herzogin-Kartoffeln", 1.69, "600-g-Packung"],
    ["GOLDÄHREN Vollkorn-Wraps", 1.19, "370-g-Packung"],
    ["TANDIL Feinwaschmittel Pflege", 2.65, "1,5-L-Flasche"],
    ["STOCKMEYER Gebackene Hähnchenbrust", 1.79, "je 125 g"],
    ["BELLASAN Rapsöl", 1.39, "0,5-L-Flasche"],
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

  it.each([
    ["ALL SEASONS Paprika", "580-ml-Glas"],
    ["KING'S CROWN Erbsen", "425-ml-Dose"],
  ])("excludes %s by its packaging (%s)", (name, unit) => {
    expect(matched(offer(name, 1.29, unit))).toEqual([]);
  });

  it("keeps loose fruit sold per kg (\"kg-Preis\" is not ice cream)", () => {
    expect(matched(offer("Bananen", 0.99, "kg-Preis"))).toEqual(["Bananen"]);
  });

  it("prices cream sold by weight per litre", () => {
    const best = bestOffers([offer("MILSANI Schlagsahne", 0.89, "200-g-Becher", "1 kg = 4.45")]);
    expect(best.get("Sahne")?.unitPrice).toBeCloseTo(4.45);
  });

  it.each([
    ["MEIN BESTES Bäckerbrötchen", 0.19, "Stück", "Brötchen vom Bäcker"],
    ["Sauerteigbrötchen", 0.39, "je Stück", "Brötchen vom Bäcker"],
    ["GOLDÄHREN Kaiserbrötchen", 0.69, "4x55-g-Packung", "Brötchen (Aufback)"],
    ["K-CLASSIC Unsere Feinen Weizenbrötchen", 0.79, "je 6 St. = 360-g-Packg.", "Brötchen (Aufback)"],
    ["MEIN BESTES Krustenbrot", 1.65, "1000-g-Stück", "Brot vom Bäcker"],
    ["Kastenweißbrot", 1.79, "je 750-g-Stück", "Brot vom Bäcker"],
  ])("files %s (%s) under %s only", (name, price, unit, product) => {
    expect(matched(offer(name, price, unit))).toEqual([product]);
  });

  it.each([
    ["GOLDÄHREN Landbrot", 1.59, "1.000-g-Packung"], // packaged, not from the bakery
    ["MEIN BESTES Walnussbrot", 1.59, "380-g-Stück"],
    ["BARILLA Spaghetti oder Fusilli Protein+", 1.99, "je 400-g-Packg."],
    ["MILSANI Milchreis", 0.39, "200-g-Becher"], // dessert, not rice
  ])("keeps %s out of the bakery and pasta products", (name, price, unit) => {
    expect(matched(offer(name, price, unit))).toEqual([]);
  });

  it("files jam under Konfitüre, not under a staple it mentions (Zucker, Erdbeeren)", () => {
    expect(matched(offer("Zentis Erdbeer Konfitüre extra", 2.49, "je 335-g-Glas"))).toEqual(["Konfitüre"]);
  });

  it.each([
    ["FELIX Gemischte Vielfalt in Gelee", 2.94, "48x85-g-Packung"],
    ["LANGNESE Bienenhonig", 3.49, "je 500-g-Glas"],
    ["MILSANI Back-Camembert", 2.99, "350-g-Packung"],
    ["BERIDA Graved Lachs", 3.99, "je 200 g"],
    ["BACK FAMILY Schokoladenstreusel", 2.49, "400-g-Packung"],
    ["MILKA Weihnachtsmischung", 4.99, "je 210-g-Packg."],
    ["BERIDA Fish & Chips", 5.99, "je 1.000 g"],
    ["LENOR Voll- oder Colorwaschmittel XXL", 9.99, "je"],
    ["CRAZY WOLF Energy Drink oder Strong Cola", 0.35, "je 0,33-l-Dose"],
    ["MÜHLENHOF Delikatess Hähnchen-Käse-Wiener", 3.99, "je 600 g"],
  ])("batch 2: keeps %s out of the wrong product", (name, price, unit) => {
    const wrong = ["Konfitüre", "Eiscreme", "Camembert / Brie", "Räucherlachs", "Schokolade (Tafel)", "Chips", "Weichspüler", "Cola", "Wiener Würstchen"];
    expect(matched(offer(name, price, unit)).filter((p) => wrong.includes(p))).toEqual([]);
  });

  it("batch 2: files the real thing", () => {
    expect(matched(offer("LANGNESE Bienenhonig", 3.49, "je 500-g-Glas"))).toContain("Honig");
    expect(matched(offer("ALMARE Norwegischer Räucherlachs", 4.29, "200-g-Packung"))).toContain("Räucherlachs");
    expect(matched(offer("LANGNESE Cremissimo", 2.39, "je 900-ml-Packg."))).toContain("Eiscreme");
  });
});
