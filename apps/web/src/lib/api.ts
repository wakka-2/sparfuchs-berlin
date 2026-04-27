const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message ?? `API error ${res.status}`);
  }

  return json as T;
}

// ── Response types (matching api-spec.md) ────────

export interface StorePrice {
  store_slug: string;
  store_name: string;
  store_color: string | null;
  store_image_url: string | null;
  price_cents: number;
  price_formatted: string;
  unit_size: string;
  unit_price_cents: number;
  unit_price_formatted: string;
  fetched_at: string;
  is_cheapest: boolean;
  is_estimated: boolean;
  external_name?: string | null;
  external_url?: string | null;
  ean?: string | null;
}

export interface ProductSavings {
  amount_cents: number;
  percentage: number;
  cheapest_store_slug: string;
  label: string;
}

export interface Product {
  id: string;
  name: string;
  name_de?: string;
  name_en?: string | null;
  category: { slug: string; name: string };
  image_url: string | null;
  default_unit: string;
  prices: StorePrice[];
  savings: ProductSavings | null;
}

export interface Category {
  slug: string;
  name: string;
  icon: string | null;
  product_count: number;
  sort_order: number;
}

export interface SearchResult {
  id: string;
  name: string;
  category_slug: string;
  cheapest_price_cents: number | null;
  cheapest_store_slug: string | null;
  relevance_score: number;
}

interface Pagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

// ── API functions ────────────────────────────────

export async function fetchProducts(params?: {
  category?: string;
  page?: number;
  limit?: number;
  sort?: "name" | "price_asc" | "price_desc" | "savings";
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.sort) searchParams.set("sort", params.sort);

  const qs = searchParams.toString();
  const res = await apiFetch<{
    success: true;
    data: { products: Product[] };
    meta: { pagination: Pagination };
  }>(`/products${qs ? `?${qs}` : ""}`);

  return { products: res.data.products, pagination: res.meta.pagination };
}

export async function fetchProduct(id: string) {
  const res = await apiFetch<{ success: true; data: Product }>(`/products/${id}`);
  return res.data;
}

export interface PriceHistoryEntry {
  store_slug: string;
  store_name: string;
  store_color: string | null;
  price_cents: number;
  price_formatted: string;
  unit_price_cents: number;
  valid_from: string;
  valid_until: string | null;
}

export async function fetchProductHistory(id: string) {
  const res = await apiFetch<{
    success: true;
    data: { product_id: string; history: PriceHistoryEntry[] };
  }>(`/products/${id}/history`);

  return res.data.history;
}

export async function searchProducts(query: string, limit = 10) {
  const res = await apiFetch<{
    success: true;
    data: { query: string; results: SearchResult[] };
  }>(`/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);

  return res.data.results;
}

export async function fetchCategories() {
  const res = await apiFetch<{
    success: true;
    data: { categories: Category[] };
  }>("/categories");

  return res.data.categories;
}

export async function calculateBasket(items: Array<{ product_id: string; quantity: number }>) {
  const res = await apiFetch<{ success: true; data: unknown }>("/basket/calculate", {
    method: "POST",
    body: JSON.stringify({ items }),
  });

  return res.data;
}
