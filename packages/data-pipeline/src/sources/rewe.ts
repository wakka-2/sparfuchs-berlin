import type { RawProductData, StoreSource } from "../types.js";

const PEPESTO_BASE_URL = process.env.PEPESTO_BASE_URL ?? "https://api.pepesto.com";
const PEPESTO_API_KEY = process.env.PEPESTO_API_KEY ?? "";

interface PepestoProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  grammage: string;
  imageUrl?: string;
  ean?: string;
  productUrl?: string;
}

interface PepestoSearchResponse {
  products: PepestoProduct[];
  total: number;
}

async function pepestoFetch<T>(path: string): Promise<T> {
  const url = `${PEPESTO_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PEPESTO_API_KEY}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Pepesto API ${response.status}: ${response.statusText} for ${path}`);
  }

  return response.json() as Promise<T>;
}

function toRawProduct(product: PepestoProduct): RawProductData {
  return {
    externalId: product.id,
    name: product.name,
    price: product.price,
    currency: product.currency ?? "EUR",
    unitSize: product.grammage ?? "",
    imageUrl: product.imageUrl,
    ean: product.ean,
    url: product.productUrl,
  };
}

export class ReweSource implements StoreSource {
  readonly storeSlug = "rewe";

  async fetchProduct(externalId: string, productName: string): Promise<RawProductData | null> {
    try {
      if (externalId) {
        const product = await pepestoFetch<PepestoProduct>(
          `/v1/supermarkets/rewe/products/${externalId}`,
        );
        if (product) return toRawProduct(product);
      }

      const result = await pepestoFetch<PepestoSearchResponse>(
        `/v1/supermarkets/rewe/products/search?query=${encodeURIComponent(productName)}&limit=1`,
      );

      if (result.products.length > 0) {
        return toRawProduct(result.products[0]);
      }

      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[rewe] Failed to fetch "${productName}" (${externalId}): ${msg}`);
      return null;
    }
  }

  async fetchAll(
    products: Array<{ externalProductId: string | null; productName: string }>,
  ): Promise<RawProductData[]> {
    const results: RawProductData[] = [];

    for (const product of products) {
      const data = await this.fetchProduct(product.externalProductId ?? "", product.productName);
      if (data) {
        results.push(data);
      }
      // Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return results;
  }
}
