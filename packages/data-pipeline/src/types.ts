/**
 * Internal types for the data pipeline.
 * These are not exported to other packages — they define the contract
 * between fetchers, normalizer, and pipeline runner.
 */

/** Raw product data as returned by a store data source (before normalization) */
export interface RawProductData {
  externalId: string;
  name: string;
  price: number;
  currency: string;
  unitSize: string;
  imageUrl?: string;
  ean?: string;
  url?: string;
}

/** Normalized product price ready for DB upsert */
export interface NormalizedPrice {
  productMatchId: string;
  priceCents: number;
  unitSize: string;
  unitType: string;
  unitPriceCents: number;
}

/** Result of a single product fetch attempt */
export interface FetchResult {
  productMatchId: string;
  externalProductId: string;
  success: boolean;
  data?: RawProductData;
  error?: string;
}

/** Pipeline run summary */
export interface PipelineRunResult {
  storeSlug: string;
  status: "success" | "partial" | "failed";
  productsFetched: number;
  productsUpdated: number;
  productsFailed: number;
  errors: string[];
  durationMs: number;
}

/** Store source interface — every fetcher must implement this */
export interface StoreSource {
  readonly storeSlug: string;
  fetchProduct(externalId: string, productName: string): Promise<RawProductData | null>;
  fetchAll(
    products: Array<{ externalProductId: string | null; productName: string }>,
  ): Promise<RawProductData[]>;
}
