import type { Context } from "hono";

/** Format cents to German-locale euro string: 119 → "1,19 €" */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

/** Format unit price: 119 cents per "L" → "1,19 €/L" */
export function formatUnitPrice(cents: number, unitType: string): string {
  return formatCents(cents) + "/" + unitType;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
}

/** Build a success response matching api-spec.md envelope */
export function success<T>(c: Context, data: T, pagination?: Pagination) {
  const meta: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  if (pagination) {
    meta.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total_items: pagination.totalItems,
      total_pages: Math.ceil(pagination.totalItems / pagination.limit),
    };
  }

  return c.json({ success: true, data, meta });
}

/** Build an error response matching api-spec.md envelope */
export function error(c: Context, status: 400 | 404 | 429 | 500 | 503, code: string, message: string) {
  return c.json(
    {
      success: false,
      error: { code, message },
      meta: { timestamp: new Date().toISOString() },
    },
    status,
  );
}
