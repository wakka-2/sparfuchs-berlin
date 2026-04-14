import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReweSource } from "../sources/rewe.js";

// Mock global fetch
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

const SAMPLE_PEPESTO_PRODUCT = {
  id: "pepesto-rewe-milch",
  name: "REWE Bio Vollmilch 3,5%",
  price: 1.19,
  currency: "EUR",
  grammage: "1L",
  imageUrl: "https://img.rewe-static.de/milch.jpg",
  ean: "4337185140961",
  productUrl: "https://www.rewe.de/produkte/milch",
};

describe("ReweSource", () => {
  let source: ReweSource;

  beforeEach(() => {
    source = new ReweSource();
  });

  it("has correct storeSlug", () => {
    expect(source.storeSlug).toBe("rewe");
  });

  describe("fetchProduct — by externalId", () => {
    it("fetches product by ID and returns normalized data", async () => {
      mockFetch.mockReturnValue(makeResponse(SAMPLE_PEPESTO_PRODUCT));

      const result = await source.fetchProduct("pepesto-rewe-milch", "Vollmilch");

      expect(result).not.toBeNull();
      expect(result?.externalId).toBe("pepesto-rewe-milch");
      expect(result?.name).toBe("REWE Bio Vollmilch 3,5%");
      expect(result?.price).toBe(1.19);
      expect(result?.currency).toBe("EUR");
      expect(result?.unitSize).toBe("1L");
      expect(result?.ean).toBe("4337185140961");
    });

    it("calls Pepesto API with correct product path", async () => {
      mockFetch.mockReturnValue(makeResponse(SAMPLE_PEPESTO_PRODUCT));

      await source.fetchProduct("pepesto-rewe-milch", "Vollmilch");

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v1/supermarkets/rewe/products/pepesto-rewe-milch");
    });

    it("sends Authorization header", async () => {
      mockFetch.mockReturnValue(makeResponse(SAMPLE_PEPESTO_PRODUCT));

      await source.fetchProduct("abc-123", "Butter");

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect((calledOptions.headers as Record<string, string>)?.["Authorization"]).toMatch(
        /^Bearer /,
      );
    });
  });

  describe("fetchProduct — fallback to search", () => {
    it("falls back to search when externalId is empty", async () => {
      mockFetch.mockReturnValue(
        makeResponse({ products: [SAMPLE_PEPESTO_PRODUCT], total: 1 }),
      );

      const result = await source.fetchProduct("", "Vollmilch");

      expect(result).not.toBeNull();
      const searchUrl = mockFetch.mock.calls[0][0] as string;
      expect(searchUrl).toContain("/search");
      expect(searchUrl).toContain("Vollmilch");
    });

    it("returns null when search returns empty results", async () => {
      mockFetch.mockReturnValue(makeResponse({ products: [], total: 0 }));

      const result = await source.fetchProduct("", "NoSuchProduct");
      expect(result).toBeNull();
    });
  });

  describe("fetchProduct — error handling", () => {
    it("returns null on API 404", async () => {
      mockFetch.mockReturnValue(makeResponse({ error: "Not found" }, 404));

      const result = await source.fetchProduct("invalid-id", "Vollmilch");
      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await source.fetchProduct("abc", "Vollmilch");
      expect(result).toBeNull();
    });

    it("returns null on API 500", async () => {
      mockFetch.mockReturnValue(makeResponse({ error: "Internal error" }, 500));

      const result = await source.fetchProduct("abc", "Vollmilch");
      expect(result).toBeNull();
    });
  });

  describe("fetchAll", () => {
    it("returns results for all successfully fetched products", async () => {
      // Mock responses for two products
      mockFetch
        .mockReturnValueOnce(makeResponse(SAMPLE_PEPESTO_PRODUCT))
        .mockReturnValueOnce(
          makeResponse({
            ...SAMPLE_PEPESTO_PRODUCT,
            id: "pepesto-rewe-butter",
            name: "REWE Bio Butter",
            price: 1.89,
          }),
        );

      // Use fake timers to skip the 200ms rate-limit delay
      vi.useFakeTimers();
      const fetchAllPromise = source.fetchAll([
        { externalProductId: "pepesto-rewe-milch", productName: "Vollmilch" },
        { externalProductId: "pepesto-rewe-butter", productName: "Butter" },
      ]);
      await vi.runAllTimersAsync();
      const results = await fetchAllPromise;
      vi.useRealTimers();

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("REWE Bio Vollmilch 3,5%");
      expect(results[1].name).toBe("REWE Bio Butter");
    });

    it("skips products that fail to fetch (no null in results)", async () => {
      mockFetch
        .mockReturnValueOnce(makeResponse(SAMPLE_PEPESTO_PRODUCT))
        .mockRejectedValueOnce(new Error("Network error"));

      vi.useFakeTimers();
      const fetchAllPromise = source.fetchAll([
        { externalProductId: "pepesto-rewe-milch", productName: "Vollmilch" },
        { externalProductId: "bad-id", productName: "NoSuchProduct" },
      ]);
      await vi.runAllTimersAsync();
      const results = await fetchAllPromise;
      vi.useRealTimers();

      expect(results).toHaveLength(1);
      expect(results[0].externalId).toBe("pepesto-rewe-milch");
    });

    it("returns empty array when all products fail", async () => {
      mockFetch.mockRejectedValue(new Error("API down"));

      vi.useFakeTimers();
      const fetchAllPromise = source.fetchAll([
        { externalProductId: "id1", productName: "Product 1" },
        { externalProductId: "id2", productName: "Product 2" },
      ]);
      await vi.runAllTimersAsync();
      const results = await fetchAllPromise;
      vi.useRealTimers();

      expect(results).toHaveLength(0);
    });
  });
});
