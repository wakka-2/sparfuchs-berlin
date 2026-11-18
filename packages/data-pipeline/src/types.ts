/**
 * Internal types for the data pipeline — the contract between store sources,
 * the catalog rules, and the runner.
 */

/** One offer exactly as a store publishes it, before catalog matching. */
export interface Offer {
  /** Brand + product name as the store prints it */
  name: string;
  /** Extra text (variety, origin) — used for matching only, never shown */
  description?: string;
  /** Pack price in euros */
  price: number;
  /** Pack size as the store prints it: "je 250 g", "500-g-Packung" */
  unitText: string;
  /** The store's own base price when it gives one: "1 kg = 6.36" */
  baseText?: string;
  imageUrl?: string;
  url?: string;
  /** Last day the offer is valid (ISO date) */
  validUntil?: string;
  /** Everyday shelf price rather than a flyer offer */
  regular?: boolean;
  /** Browse category when the store itself says (Aldi); otherwise derived from the name */
  category?: string;
}

/** Store source interface — every store module must implement this */
export interface StoreSource {
  readonly storeSlug: string;
  /** All offers valid today. Throws when the store cannot be read. */
  fetchOffers(): Promise<Offer[]>;
}

/** Pipeline run summary */
export interface PipelineRunResult {
  storeSlug: string;
  status: "success" | "failed";
  /** Offers read from the store */
  productsFetched: number;
  /** Catalog products that got a current price */
  productsUpdated: number;
  productsFailed: number;
  errors: string[];
  durationMs: number;
}
