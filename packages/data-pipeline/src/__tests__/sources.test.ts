import { describe, it, expect } from "vitest";
import { parseAldi } from "../sources/aldi.js";
import { parseKaufland } from "../sources/kaufland.js";
import { parsePennySections, parsePennyTiles, isoWeek } from "../sources/penny.js";
import { parseReweTiles } from "../sources/rewe.js";
import { saturdayOf } from "../http.js";

// Fixtures are trimmed copies of the stores' real payloads (week 47/2026).

describe("Aldi Nord", () => {
  const product = (validFrom: number, validUntil: number) => ({
    name: "Butter", brandName: "LANDLIEBE", salesUnit: "250-g-Packung", productSlug: "butter-123",
    currentPrice: { priceValue: 1.39, validFrom, validUntil, basePrice: [{ basePriceValue: 5.56, basePriceScale: "kg" }] },
    assets: [{ type: "primary", url: "https://s7g10.scene7.com/is/image/aldinord/butter" }],
  });
  const page = (products: object[]) => {
    const apiData = JSON.stringify([
      ["OFFER_GET", { res: { algoliaDataMap: Object.fromEntries(products.map((p, i) => [i, p])) } }],
    ]);
    return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { apiData } } })}</script>`;
  };
  const now = new Date("2026-11-17T10:00:00Z");
  const t = now.getTime() / 1000;

  it("reads structured offers valid today", () => {
    const [o] = parseAldi(page([product(t - 86400, t + 86400)]), now);
    expect(o).toMatchObject({
      name: "LANDLIEBE Butter", price: 1.39, unitText: "250-g-Packung", baseText: "1 kg = 5.56",
      url: "https://www.aldi-nord.de/produkt/butter-123.html",
      imageUrl: "https://s7g10.scene7.com/is/image/aldinord/butter",
    });
  });

  it("skips next week's preview", () => {
    expect(parseAldi(page([product(t + 86400, t + 5 * 86400)]), now)).toEqual([]);
  });

  it("fails loudly when the page structure changes", () => {
    expect(() => parseAldi("<html></html>", now)).toThrow(/structure changed/);
  });
});

describe("Kaufland", () => {
  const offer = (offerId: string, salesFrom: string) => ({
    offerId, title: "SANLUCAR ", subtitle: "Ital. Tafeltrauben, lose ", price: 4.99, unit: "je kg",
    listImage: "https://kaufland.media.schwarz/is/image/schwarz/01182810", salesFrom, salesTo: "2026-11-21",
  });
  const page = (offers: object[]) =>
    `<script>window.SSR['x'] = ${JSON.stringify({ props: { offerData: { cycles: [{ categories: [{ offers }, { offers }] }] } } })};</script>`;

  it("reads offers on sale today, once each", () => {
    const offers = parseKaufland(page([offer("A", "2026-11-16"), offer("B", "2026-11-19")]), "2026-11-17");
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ name: "SANLUCAR Ital. Tafeltrauben, lose", price: 4.99, validUntil: "2026-11-21" });
  });

  it("fails loudly when the page structure changes", () => {
    expect(() => parseKaufland("<html></html>")).toThrow(/structure changed/);
  });
});

describe("Penny", () => {
  it("lists only this week's sections that have started", () => {
    const html = [
      '<button data-category-id="ab-montag--kuehlregal" data-week="current">',
      '<button data-category-id="ab-donnerstag--getraenke1" data-week="current">',
      '<button data-category-id="ab-montag--obst" data-week="next">',
    ].join("");
    expect(parsePennySections(html, "2026-11-17")).toEqual(["kuehlregal"]); // Tuesday
    expect(parsePennySections(html, "2026-11-19")).toEqual(["kuehlregal", "getraenke1"]);
  });

  it("keeps regular offers and drops app-only and multi-buy prices", () => {
    const offers = parsePennyTiles(
      [
        { primaryType: "offer", title: "PHILADELPHIA Frischkäse­zubereitung*", quantity: "je 195 g", price: "1.11", basePrice: "(1 kg = 5.69)" },
        { primaryType: "offer", title: "MC CAIN Golden Longs*", quantity: "je 600 g", price: "1.79²" },
        { primaryType: "promo", title: "App-Deal", quantity: "je 100 g", price: "0.99" },
        { primaryType: "offer", title: "MEGGLE*", quantity: "mit App: je 400 g", price: "1.99" },
      ],
      "2026-11-21",
    );
    expect(offers.map((o) => o.name)).toEqual(["PHILADELPHIA Frischkäsezubereitung"]);
  });

  it("formats ISO weeks the way Penny's API expects", () => {
    expect(isoWeek("2026-11-17")).toBe("2026-47");
    expect(isoWeek("2027-01-01")).toBe("2026-53");
  });
});

describe("REWE", () => {
  it("reads title, pack size, base price and price from tile parts", () => {
    const [o] = parseReweTiles(
      [{
        title: "Jacobs Krönung",
        additional: ["versch. Sorten, gemahlener Bohnenkaffee", ", je 500-g-Pckg.", ", (1 kg = 11,58 €)"],
        price: "5,79 €",
        img: "https://img.rewe-static.de/x.png",
      }],
      "2026-11-21",
    );
    expect(o).toMatchObject({ name: "Jacobs Krönung", price: 5.79, unitText: "je 500-g-Pckg.", baseText: "(1 kg = 11,58 €)" });
  });

  it("skips tiles that have not rendered a price", () => {
    expect(parseReweTiles([{ title: "Skeleton", additional: [], price: "", img: "" }], "2026-11-21")).toEqual([]);
  });
});

describe("saturdayOf", () => {
  it("ends the flyer week on Saturday", () => {
    expect(saturdayOf("2026-11-17")).toBe("2026-11-21");
    expect(saturdayOf("2026-11-21")).toBe("2026-11-21");
  });
});
