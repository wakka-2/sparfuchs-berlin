/**
 * Lidl scraper — placeholder.
 *
 * Lidl.de sells only non-food items online (electronics, clothing, household
 * goods). Grocery prices are exclusively in physical stores and not exposed
 * via any public web endpoint. The weekly flyer is published as a PDF and
 * has no machine-readable API.
 *
 * Until a reliable data source is found (e.g. Lidl Plus API, price aggregator,
 * or flyer PDF parser), this source returns no data so that REWE prices can
 * be shown without blocking the pipeline.
 */
import type { RawProductData, StoreSource } from "../types.js";

export class LidlSource implements StoreSource {
  readonly storeSlug = "lidl";

  async fetchProduct(
    _externalId: string,
    productName: string,
  ): Promise<RawProductData | null> {
    console.warn(
      `[lidl] No online grocery data available for "${productName}" — Lidl does not expose grocery prices online`,
    );
    return null;
  }

  async fetchAll(
    products: Array<{ externalProductId: string | null; productName: string }>,
  ): Promise<RawProductData[]> {
    console.warn(
      `[lidl] Skipping ${products.length} products — Lidl grocery prices are not available online`,
    );
    return [];
  }
}
