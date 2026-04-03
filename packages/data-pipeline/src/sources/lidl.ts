import type { RawProductData, StoreSource } from "../types.js";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN ?? "";
const APIFY_LIDL_ACTOR_ID = process.env.APIFY_LIDL_ACTOR_ID ?? "easyapi/lidl-product-scraper";
const APIFY_BASE_URL = "https://api.apify.com/v2";

interface ApifyLidlProduct {
  id: string;
  title: string;
  price: { value: number; currency: string };
  unitPrice?: string;
  image?: string;
  url?: string;
  ean?: string;
  stockStatus?: string;
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyDatasetResponse {
  data?: ApifyLidlProduct[];
}

async function apifyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${APIFY_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${APIFY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    signal: AbortSignal.timeout(120000), // Apify runs can take time
  });

  if (!response.ok) {
    throw new Error(`Apify API ${response.status}: ${response.statusText} for ${path}`);
  }

  return response.json() as Promise<T>;
}

function toRawProduct(product: ApifyLidlProduct): RawProductData {
  return {
    externalId: product.id,
    name: product.title,
    price: product.price.value,
    currency: product.price.currency ?? "EUR",
    unitSize: product.unitPrice ?? "",
    imageUrl: product.image,
    ean: product.ean,
    url: product.url,
  };
}

async function waitForRun(runId: string, maxWaitMs = 90000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await apifyFetch<{ data: { status: string; defaultDatasetId: string } }>(
      `/actor-runs/${runId}`,
    );

    if (result.data.status === "SUCCEEDED") {
      return result.data.defaultDatasetId;
    }

    if (result.data.status === "FAILED" || result.data.status === "ABORTED") {
      throw new Error(`Apify run ${runId} ended with status: ${result.data.status}`);
    }

    // Poll every 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWaitMs}ms`);
}

export class LidlSource implements StoreSource {
  readonly storeSlug = "lidl";

  async fetchProduct(externalId: string, productName: string): Promise<RawProductData | null> {
    try {
      // For single product, run the actor with a search query
      const runResponse = await apifyFetch<ApifyRunResponse>(
        `/acts/${APIFY_LIDL_ACTOR_ID}/runs`,
        {
          method: "POST",
          body: JSON.stringify({
            searchQuery: externalId || productName,
            maxItems: 1,
            country: "de",
          }),
        },
      );

      const datasetId = await waitForRun(runResponse.data.id);

      const dataset = await apifyFetch<ApifyDatasetResponse>(
        `/datasets/${datasetId}/items?limit=1`,
      );

      const items = Array.isArray(dataset) ? dataset : dataset.data ?? [];

      if (items.length > 0) {
        return toRawProduct(items[0]);
      }

      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[lidl] Failed to fetch "${productName}" (${externalId}): ${msg}`);
      return null;
    }
  }

  async fetchAll(
    products: Array<{ externalProductId: string | null; productName: string }>,
  ): Promise<RawProductData[]> {
    const results: RawProductData[] = [];

    // Batch search — run actor with all product names
    const searchQueries = products.map((p) => p.externalProductId || p.productName);

    try {
      console.log(`[lidl] Starting batch fetch for ${products.length} products...`);

      for (const query of searchQueries) {
        const data = await this.fetchProduct("", query);
        if (data) {
          results.push(data);
        }
        // Respect Apify rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[lidl] Batch fetch error: ${msg}`);
    }

    return results;
  }
}
