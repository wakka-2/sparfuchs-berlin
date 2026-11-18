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
  /** Last day of the offer (YYYY-MM-DD) */
  valid_until: string | null;
  is_cheapest: boolean;
  is_estimated: boolean;
  /** Flyer offer (true) or the store's everyday shelf price (false) */
  is_offer: boolean;
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

/** Anything a store publishes: a weekly offer or an Aldi everyday price. */
export interface StoreOffer {
  id: string;
  store_slug: string;
  store_name: string;
  store_color: string | null;
  name: string;
  price_cents: number;
  price_formatted: string;
  unit_text: string;
  base_text: string | null;
  image_url: string | null;
  url: string | null;
  is_offer: boolean;
  valid_until: string;
  category: string | null;
  unit_price_formatted: string | null;
  /** The very same product (brand, name and size) at other stores this week */
  also_at: Array<{ store_slug: string; store_name: string; price_formatted: string }>;
}

export type OfferSort = "relevance" | "price" | "unit_price";

export type OfferType = "offer" | "regular";

export async function fetchOffers(params: {
  type: OfferType; store?: string; q?: string; page?: number; category?: string; sort?: OfferSort;
}) {
  const sp = new URLSearchParams({ type: params.type });
  if (params.category) sp.set("category", params.category);
  if (params.sort && params.sort !== "relevance") sp.set("sort", params.sort);
  if (params.store) sp.set("store", params.store);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  const res = await apiFetch<{
    success: true;
    data: { offers: StoreOffer[]; store_counts: Record<string, number>; category_counts: Record<string, number> };
    meta: { pagination: Pagination };
  }>(`/offers?${sp}`);
  return { ...res.data, pagination: res.meta.pagination };
}

// ── Review queue (site owner only, token-protected) ──

export interface ReviewItem {
  id: string;
  kind: "match" | "price";
  status: "pending" | "approved" | "rejected";
  store_name: string;
  store_color: string | null;
  product_name: string;
  offer_name: string;
  unit_text: string;
  price_formatted: string;
  unit_price_cents: number | null;
  image_url: string | null;
  url: string | null;
  reason: string;
  created_at: string;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function fetchReviews(token: string) {
  const res = await apiFetch<{ success: true; data: { reviews: ReviewItem[] } }>("/admin/reviews", { headers: bearer(token) });
  return res.data.reviews;
}

export async function decideReview(token: string, id: string, status: "approved" | "rejected") {
  await apiFetch(`/admin/reviews/${id}`, { method: "POST", headers: bearer(token), body: JSON.stringify({ status }) });
}
