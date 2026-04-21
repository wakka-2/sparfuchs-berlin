/**
 * Lidl scraper — uses fallback baseline prices.
 *
 * Lidl.de sells only non-food items online (electronics, clothing, household
 * goods). Grocery prices are exclusively in physical stores and not exposed
 * via any public web endpoint. The weekly flyer is published as a PDF with
 * no machine-readable API.
 *
 * This source uses the fallback price table with Lidl-specific multipliers
 * so that Lidl products appear in the comparison alongside the other stores.
 */
import type { RawProductData, StoreSource } from "../types.js";
import { getFallbackPrice } from "./fallback-prices.js";

const STORE_URL = "https://www.lidl.de";

export class LidlSource implements StoreSource {
  readonly storeSlug = "lidl";

  async fetchProduct(
    _externalId: string,
    productName: string,
  ): Promise<RawProductData | null> {
    const fallback = getFallbackPrice(productName, "lidl", STORE_URL);
    if (fallback) {
      console.log(`[lidl] "${productName}" → fallback price @ ${fallback.price} €`);
      return {
        externalId: "",
        name: productName,
        price: fallback.price,
        currency: "EUR",
        unitSize: fallback.unitSize,
        url: fallback.url,
      };
    }
    console.warn(`[lidl] No fallback price for "${productName}"`);
    return null;
  }

  async fetchAll(
    products: Array<{ externalProductId: string | null; productName: string }>,
  ): Promise<RawProductData[]> {
    const results: RawProductData[] = [];
    for (const product of products) {
      const fallback = getFallbackPrice(product.productName, "lidl", STORE_URL);
      if (fallback) {
        console.log(`[lidl] "${product.productName}" → fallback price @ ${fallback.price} €`);
        results.push({
          externalId: "",
          name: product.productName,
          price: fallback.price,
          currency: "EUR",
          unitSize: fallback.unitSize,
          url: fallback.url,
        });
      } else {
        console.warn(`[lidl] No fallback price for "${product.productName}"`);
      }
    }
    return results;
  }
}
