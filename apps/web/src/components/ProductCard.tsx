import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Product } from "../lib/api";
import { AddToListButton } from "./AddToListButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();

  const cheapestPrice = product.prices.find((p) => p.is_cheapest) ?? product.prices[0];
  const hasMultipleStores = product.prices.length > 1;

  // Calculate savings % if multiple stores
  const prices = product.prices.map((p) => p.price_cents).filter(Boolean) as number[];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const savingsPct = hasMultipleStores && maxPrice > 0
    ? Math.round(((maxPrice - minPrice) / maxPrice) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-200">
      {/* Full-card navigation link */}
      <Link
        to={`/produkt/${product.id}`}
        className="absolute inset-0 rounded-2xl z-0"
        aria-label={product.name}
      />

      {/* Savings badge — top-right corner */}
      {savingsPct >= 10 && (
        <div className="absolute right-3 top-3 z-10">
          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            −{savingsPct}%
          </span>
        </div>
      )}

      {/* Product image */}
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-auto max-w-full object-contain p-4 transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl text-gray-200" aria-hidden="true">📦</span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category label */}
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
          {product.category.name}
        </p>

        {/* Product name */}
        <h3 className="mb-3 text-sm font-bold leading-snug text-gray-900 line-clamp-2">
          {product.name}
        </h3>

        {/* Price comparison — one row per store */}
        <div className="mt-auto space-y-1.5">
          {product.prices.length > 0 ? (
            <>
              {product.prices.map((price) => {
                const isCheapest = price.is_cheapest && hasMultipleStores;
                return (
                  <div
                    key={price.store_slug}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
                      isCheapest
                        ? "bg-green-50 ring-1 ring-green-200"
                        : "bg-gray-50"
                    }`}
                  >
                    {/* Store colour dot */}
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: price.store_color ?? "#888" }}
                    />
                    {/* Store name */}
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-500">
                      {price.store_name}
                    </span>
                    {/* Price */}
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        isCheapest ? "text-green-700" : "text-gray-800"
                      }`}
                    >
                      {price.price_formatted}
                    </span>
                    {/* Cheapest badge */}
                    {isCheapest && (
                      <span className="shrink-0 rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {t("product.cheaper")}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Unit price line */}
              {cheapestPrice?.unit_price_formatted && (
                <p className="pt-0.5 text-right text-[11px] text-gray-400">
                  {cheapestPrice.unit_price_formatted}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">{t("product.noPrices")}</p>
          )}
        </div>

        {/* Add to list */}
        <div className="relative z-10 mt-3 border-t border-gray-100 pt-3">
          <AddToListButton productId={product.id} productName={product.name} />
        </div>
      </div>
    </div>
  );
}
