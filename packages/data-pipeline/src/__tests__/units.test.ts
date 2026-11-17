import { describe, it, expect } from "vitest";
import { unitPrice } from "../units.js";

const o = (price: number, unitText: string, baseText?: string) => ({ price, unitText, baseText });

describe("unitPrice", () => {
  it("prefers the store's own base price", () => {
    expect(unitPrice(o(1.59, "je 250 g", "(1 kg = 6.36)"), "kg")).toBeCloseTo(6.36);
    expect(unitPrice(o(5.79, "je 500-g-Pckg.", "(1 kg = 11,58 €)"), "kg")).toBeCloseTo(11.58);
    expect(unitPrice(o(0.89, "1,5-L-Flasche", "1 Liter = 0.59"), "L")).toBeCloseTo(0.59);
  });

  it("quotes the dearer end of a base-price range", () => {
    expect(unitPrice(o(1.99, "je 330 - 600-g-Packg.", "(1 kg = 3.32 - 6.03)"), "kg")).toBeCloseTo(6.03);
  });

  it("converts 100 g base prices to per kg", () => {
    expect(unitPrice(o(1.2, "je Packg.", "100 g = 1,20 €"), "kg")).toBeCloseTo(12);
  });

  it("computes from the pack size when there is no base price", () => {
    expect(unitPrice(o(1.59, "je 100 g"), "kg")).toBeCloseTo(15.9);
    expect(unitPrice(o(0.99, "je 1 I"), "L")).toBeCloseTo(0.99); // Penny's capital-I litre
    expect(unitPrice(o(4.49, "je 6 x 1,5-l-Fl."), "L")).toBeCloseTo(0.4989, 3);
    expect(unitPrice(o(1.99, "je kg"), "kg")).toBeCloseTo(1.99);
    expect(unitPrice(o(0.99, "kg-Preis"), "kg")).toBeCloseTo(0.99);
  });

  it("refuses to compare across dimensions", () => {
    expect(unitPrice(o(2.59, "je 250-g-Tafel", "(1 kg = 10,36 €)"), "L")).toBeNull();
    expect(unitPrice(o(1.79, "je Stück"), "kg")).toBeNull();
  });

  it("prices piece goods per piece, roll or wash load", () => {
    expect(unitPrice(o(0.88, "je Stück"), "Stück")).toBeCloseTo(0.88);
    expect(unitPrice(o(9.69, "32x200-Blatt-Packung"), "Stück")).toBeCloseTo(0.3028, 3);
    expect(unitPrice(o(4.99, "je 20 WL-Fl.", "(1 WL = 0,25 €)"), "Stück")).toBeCloseTo(0.25);
    expect(unitPrice(o(7.99, "je", "(pro Anwendung = 0.08)"), "Stück")).toBeCloseTo(0.08);
    // a weight with no piece count is a pack, not a piece
    expect(unitPrice(o(1.49, "250-g-Packung"), "Stück")).toBeNull();
  });
});
