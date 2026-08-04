/**
 * Tests for Penny offer-tile parsing.
 *
 * Penny tiles mix an app-exclusive price, a struck-through UVP, a discount
 * badge and prose annotations that repeat a price. Picking the wrong line
 * yields either the app-only price or a "product name" like "App-preis 2.99*€".
 */
import { describe, it, expect } from "vitest";
import { parseTileText } from "../sources/penny.js";

describe("parseTileText", () => {
  it("takes the regular price, not the app-only price", () => {
    // Real tile (2026-08-04). The "Nur mit App" badge is followed by the
    // REGULAR price (3.59); the app price (2.99*) carries the asterisk.
    const text = [
      "Nur mit App",
      "3.59",
      "App-preis 2.99*€",
      "2.99*",
      "Nur mit App",
      "-16%**",
      "SONNENDORFER Körndleier",
      "ohne App: je Packung 3.59",
    ].join("\n");

    const result = parseTileText(text, "");
    expect(result).not.toBeNull();
    expect(result?.price).toBe(3.59);
    expect(result?.name).toBe("SONNENDORFER Körndleier");
  });

  it("ignores UVP and picks the sale price", () => {
    const text = "UVP 3.99\n1.79\n-55%\nSALAKIS Natur\nje 180 g (1 kg = 9.94)";
    const result = parseTileText(text, "");
    expect(result?.price).toBe(1.79);
    expect(result?.name).toBe("SALAKIS Natur");
    expect(result?.unitSize).toBe("je 180 g (1 kg = 9.94)");
  });

  it("skips a leading app price and takes the regular one", () => {
    const text =
      "Nur mit App\n1.99*\nUVP 3.99\n2.29\n-50%\n-42%\nMEGGLE Streichzart*\nje 400 g (1 kg = 4.98)";
    const result = parseTileText(text, "");
    expect(result?.price).toBe(2.29);
    expect(result?.name).toBe("MEGGLE Streichzart*");
  });

  it("treats a discount badge with trailing asterisks as a badge", () => {
    // "-16%**" must not survive as the product name
    const result = parseTileText("2.49\n-16%**\nEcht Bio Milch", "");
    expect(result?.name).toBe("Echt Bio Milch");
  });

  it("returns null when every price is app-exclusive", () => {
    expect(parseTileText("Nur mit App\n1.99*\nIrgendein Produkt", "")).toBeNull();
  });

  it("returns null when there is no price", () => {
    expect(parseTileText("Produkt ohne Preis", "")).toBeNull();
  });

  it("rejects multi-pack tiles whose price covers the whole pack", () => {
    const text = "5.99\nWasser Klassik\nje 12 x 1 l (1 l = 0.50)";
    expect(parseTileText(text, "")).toBeNull();
  });
});
