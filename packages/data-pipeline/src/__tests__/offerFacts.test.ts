import { describe, it, expect } from "vitest";
import { matchKey, offerFacts } from "../offerFacts.js";
import { categorize } from "../categorize.js";

const o = (name: string, price: number, unitText: string, baseText?: string) => ({ name, price, unitText, baseText });

describe("matchKey", () => {
  it("matches the same branded product across stores despite formatting", () => {
    expect(matchKey(o("MILKA Alpenmilch", 1.19, "je 100-g-Tafel"))).toBe(matchKey(o("Milka Alpenmilch*", 1.29, "100 g")));
  });

  it("keeps different pack sizes and different products apart", () => {
    expect(matchKey(o("MILKA Alpenmilch", 1.19, "je 100-g-Tafel"))).not.toBe(matchKey(o("MILKA Alpenmilch", 2.99, "je 270-g-Tafel")));
    expect(matchKey(o("MILKA Alpenmilch", 1.19, "je 100-g-Tafel"))).not.toBe(matchKey(o("MILKA Haselnuss", 1.19, "je 100-g-Tafel")));
  });

  it("never matches multi-variant offers or one-word names", () => {
    expect(matchKey(o("BRESSO Frischkäse oder Frischkäsezubereitung", 1.29, "je 150-g-Packg."))).toBeNull();
    expect(matchKey(o("Bananen", 0.99, "kg-Preis"))).toBeNull();
  });
});

describe("offerFacts", () => {
  it("prefers the store's category, else derives one from the name", () => {
    expect(offerFacts({ ...o("X Y", 1, "500 g"), category: "vorrat" }).category).toBe("vorrat");
    expect(offerFacts(o("LANDLIEBE Butter", 1.99, "je 250-g-Pckg.")).category).toBe("milch-kaese");
  });

  it("gives no per-piece price to a pack with no counted size", () => {
    expect(offerFacts(o("MILKA Weihnachtsmann", 1.99, "je Packung")).unitPriceCents).toBeNull();
    expect(offerFacts(o("LANDFREUDE Eier", 2.49, "10-Stück-Packung"))).toMatchObject({ unitPriceCents: 25, unitKind: "Stück" });
  });

  it("computes the price per unit in cents", () => {
    expect(offerFacts(o("LANDLIEBE Butter", 1.99, "je 250-g-Pckg."))).toMatchObject({ unitPriceCents: 796, unitKind: "kg" });
  });
});

describe("categorize", () => {
  it.each([
    ["FRANZISKANER Premium-Weißbier", "alkohol"],
    ["GOLDÄHREN Sandwichtoast", "brot-aufstriche"],
    ["MÜHLENHOF Frischer bayerischer Leberkäse", "fleisch-fisch"],
    ["ORO DI PARMA Tomatenmark", "vorrat"],
    ["Ital. Tafeläpfel, rot", "obst-gemuese"],
    ["ARIEL All in 1 Pods", "haushalt"],
    ["ULTIMATE SPEED® Eiskratzer mit Bürste", "sonstiges"],
    ["NIKE Damen-Freizeitschuhe", "sonstiges"],
  ])("%s → %s", (name, cat) => expect(categorize(name)).toBe(cat));
});
