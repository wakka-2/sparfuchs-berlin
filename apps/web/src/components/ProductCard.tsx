import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Product } from "../lib/api";
import { AddToListButton } from "./AddToListButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();

  const hasMultipleStores = product.prices.length > 1;

  const prices = product.prices.map((p) => p.price_cents).filter(Boolean) as number[];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const savingsPct =
    hasMultipleStores && maxPrice > 0
      ? Math.round(((maxPrice - minPrice) / maxPrice) * 100)
      : 0;

  const cheapestPrice = product.prices.find((p) => p.is_cheapest) ?? product.prices[0];

  // Best image: cheapest store's per-store image, then any store image, then product-level image
  const heroImage =
    cheapestPrice?.store_image_url ??
    product.prices.find((p) => p.store_image_url)?.store_image_url ??
    product.image_url ??
    null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md">
      {/* Savings badge */}
      {savingsPct >= 10 && (
        <div className="absolute right-3 top-3 z-10">
          <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow">
            bis −{savingsPct}%
          </span>
        </div>
      )}

      {/* Image — navigates to product detail */}
      <Link
        to={`/produkt/${product.id}`}
        className="flex h-40 items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
        tabIndex={0}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={product.name}
            className="h-full w-auto max-w-full object-contain p-4 transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl opacity-20" aria-hidden="true">📦</span>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 pt-3">
        {/* Category pill */}
        <span className="mb-2 inline-block w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {product.category.name}
        </span>

        {/* Product name */}
        <Link
          to={`/produkt/${product.id}`}
          className="mb-3 block text-sm font-bold leading-snug text-gray-900 line-clamp-2 hover:text-green-700 focus-visible:outline-none"
        >
          {product.name}
        </Link>

        {/* Price rows — one per store */}
        <div className="mt-auto space-y-1">
          {product.prices.length > 0 ? (
            <>
              {product.prices.map((price) => {
                const isCheapest = price.is_cheapest && hasMultipleStores;
                return (
                  <div
                    key={price.store_slug}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${
                      isCheapest ? "bg-green-50 ring-1 ring-inset ring-green-200" : "bg-gray-50"
                    }`}
                  >
                    {/* Per-store product thumbnail — only when it differs from the hero image */}
                    {price.store_image_url && price.store_image_url !== product.image_url ? (
                      <img
                        src={price.store_image_url}
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 rounded object-contain bg-white"
                        loading="lazy"
                      />
                    ) : (
                      /* Store colour dot */
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: price.store_color ?? "#888" }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Store name */}
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-500">
                      {price.store_name}
                    </span>

                    {/* Price */}
                    <span
                      className={`shrink-0 text-sm font-extrabold tabular-nums ${
                        isCheapest ? "text-green-700" : "text-gray-800"
                      }`}
                    >
                      {price.price_formatted}
                    </span>

                    {/* Cheapest label */}
                    {isCheapest && (
                      <span className="shrink-0 rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
                        {t("product.cheaper")}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Unit price of cheapest option */}
              {cheapestPrice?.unit_price_formatted && (
                <p className="pt-0.5 text-right text-[11px] tabular-nums text-gray-400">
                  {cheapestPrice.unit_price_formatted}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-400">
              <span aria-hidden="true">—</span>
              <span>{t("product.noPrices")}</span>
            </div>
          )}
        </div>

        {/* Add to list */}
        <div className="relative z-10 mt-3 border-t border-gray-100 pt-3">
          <AddToListButton productId={product.id} productName={product.name} />
        </div>
      </div>
    </article>
  );
}
