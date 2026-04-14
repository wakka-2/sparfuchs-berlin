import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Product } from "../lib/api";
import { PriceTag } from "./PriceTag";
import { SavingsBadge } from "./SavingsBadge";
import { AddToListButton } from "./AddToListButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();

  return (
    // Outer div is `relative` so the overlay Link can be `absolute inset-0`.
    // AddToListButton sits above the overlay via `relative z-10` — this avoids
    // nesting an interactive <button> inside an <a>, which is invalid HTML and
    // breaks keyboard / assistive-technology navigation.
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Full-card navigation link — sits below the button layer */}
      <Link
        to={`/produkt/${product.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={product.name}
      />

      {/* Product image */}
      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-auto object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl text-gray-300" aria-hidden="true">📦</span>
        )}
      </div>

      {/* Product name + category */}
      <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
      <p className="mb-3 text-xs text-gray-500">{product.category.name}</p>

      {/* Price tags */}
      {product.prices.length > 0 ? (
        <div className="mb-2 flex gap-2">
          {product.prices.map((price) => (
            <PriceTag key={price.store_slug} price={price} />
          ))}
        </div>
      ) : (
        <p className="mb-2 text-sm text-gray-400">{t("product.noPrices")}</p>
      )}

      {/* Savings badge */}
      {product.savings && <SavingsBadge savings={product.savings} />}

      {/* Add to list — relative + z-10 places it above the overlay Link */}
      <div className="relative z-10 mt-3">
        <AddToListButton productId={product.id} productName={product.name} />
      </div>
    </div>
  );
}
