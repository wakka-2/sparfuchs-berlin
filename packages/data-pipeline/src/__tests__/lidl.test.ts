import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LidlSource } from "../sources/lidl.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response);
}

const SAMPLE_APIFY_PRODUCT = {
  id: "lidl-milch-001",
  title: "Lidl Bio Vollmilch 3,8%",
  price: { value: 0.99, currency: "EUR" },
  unitPrice: "0,99 €/L",
  image: "https://www.lidl.de/img/milch.jpg",
  url: "https://www.lidl.de/p/milch",
  ean: "20394756",
};

/** Build the sequence of mock responses for a successful Apify actor run */
function mockSuccessfulApifyRun(products: unknown[]) {
  // 1. Trigger actor run → returns run info
  mockFetch.mockReturnValueOnce(
    makeResponse({ data: { id: "run-abc-123", status: "RUNNING", defaultDatasetId: "" } }),
  );
  // 2. Poll for run status → SUCCEEDED
  mockFetch.mockReturnValueOnce(
    makeResponse({
      data: { id: "run-abc-123", status: "SUCCEEDED", defaultDatasetId: "dataset-xyz" },
    }),
  );
  // 3. Fetch dataset items
  mockFetch.mockReturnValueOnce(makeResponse(products));
}

describe("LidlSource", () => {
  let source: LidlSource;

  beforeEach(() => {
    source = new LidlSource();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has correct storeSlug", () => {
    expect(source.storeSlug).toBe("lidl");
  });

  describe("fetchProduct — successful run", () => {
    it("returns normalized product data on success", async () => {
      mockSuccessfulApifyRun([SAMPLE_APIFY_PRODUCT]);

      const promise = source.fetchProduct("lidl-milch-001", "Vollmilch");
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.externalId).toBe("lidl-milch-001");
      expect(result?.name).toBe("Lidl Bio Vollmilch 3,8%");
      expect(result?.price).toBe(0.99);
      expect(result?.currency).toBe("EUR");
      expect(result?.ean).toBe("20394756");
    });

    it("sends POST to trigger actor run", async () => {
      mockSuccessfulApifyRun([SAMPLE_APIFY_PRODUCT]);

      const promise = source.fetchProduct("lidl-milch-001", "Vollmilch");
      await vi.runAllTimersAsync();
      await promise;

      const triggerCall = mockFetch.mock.calls[0];
      expect(triggerCall[1]?.method).toBe("POST");
      const body = JSON.parse(triggerCall[1]?.body as string);
      expect(body.country).toBe("de");
    });

    it("uses externalId as searchQuery when provided", async () => {
      mockSuccessfulApifyRun([SAMPLE_APIFY_PRODUCT]);

      const promise = source.fetchProduct("lidl-milch-001", "Vollmilch");
      await vi.runAllTimersAsync();
      await promise;

      const triggerCall = mockFetch.mock.calls[0];
      const body = JSON.parse(triggerCall[1]?.body as string);
      expect(body.searchQuery).toBe("lidl-milch-001");
    });

    it("falls back to productName when externalId is empty", async () => {
      mockSuccessfulApifyRun([SAMPLE_APIFY_PRODUCT]);

      const promise = source.fetchProduct("", "Vollmilch");
      await vi.runAllTimersAsync();
      await promise;

      const triggerCall = mockFetch.mock.calls[0];
      const body = JSON.parse(triggerCall[1]?.body as string);
      expect(body.searchQuery).toBe("Vollmilch");
    });

    it("returns null when dataset is empty", async () => {
      mockSuccessfulApifyRun([]);

      const promise = source.fetchProduct("", "NoResults");
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe("fetchProduct — error handling", () => {
    it("returns null when actor run fails", async () => {
      // 1. Trigger run
      mockFetch.mockReturnValueOnce(
        makeResponse({ data: { id: "run-fail", status: "RUNNING", defaultDatasetId: "" } }),
      );
      // 2. Poll → FAILED
      mockFetch.mockReturnValueOnce(
        makeResponse({ data: { id: "run-fail", status: "FAILED", defaultDatasetId: "" } }),
      );

      const promise = source.fetchProduct("bad-id", "Product");
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it("returns null on network error triggering run", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const promise = source.fetchProduct("id", "Product");
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it("returns null when Apify API returns 401", async () => {
      mockFetch.mockReturnValueOnce(makeResponse({ error: "Unauthorized" }, 401));

      const promise = source.fetchProduct("id", "Product");
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe("fetchAll", () => {
    it("returns results for all successfully fetched products", async () => {
      // Two successful runs
      mockSuccessfulApifyRun([SAMPLE_APIFY_PRODUCT]);
      mockSuccessfulApifyRun([
        { ...SAMPLE_APIFY_PRODUCT, id: "lidl-butter-001", title: "Lidl Bio Butter", price: { value: 1.79, currency: "EUR" } },
      ]);

      const promise = source.fetchAll([
        { externalProductId: "lidl-milch-001", productName: "Vollmilch" },
        { externalProductId: "lidl-butter-001", productName: "Butter" },
      ]);
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(2);
    });

    it("skips failed fetches (no nulls in output)", async () => {
      // First succeeds, second fails
      mockSuccessfulApifyRun([SAMPLE_APIFY_PRODUCT]);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const promise = source.fetchAll([
        { externalProductId: "lidl-milch-001", productName: "Vollmilch" },
        { externalProductId: "bad-id", productName: "NoProduct" },
      ]);
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Lidl Bio Vollmilch 3,8%");
    });

    it("returns empty array when all fetches fail", async () => {
      mockFetch.mockRejectedValue(new Error("API down"));

      const promise = source.fetchAll([
        { externalProductId: "id1", productName: "Product A" },
        { externalProductId: "id2", productName: "Product B" },
      ]);
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(0);
    });
  });
});
