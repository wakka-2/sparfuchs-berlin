import { Link } from "react-router";
import type { Product } from "../lib/api";
import { PriceTag } from "./PriceTag";
import { SavingsBadge } from "./SavingsBadge";
import { AddToListButton } from "./AddToListButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/produkt/${product.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
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
          <span className="text-3xl text-gray-300">📦</span>
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
        <p className="mb-2 text-sm text-gray-400">Keine Preise verfügbar</p>
      )}

      {/* Savings badge */}
      {product.savings && <SavingsBadge savings={product.savings} />}

      {/* Add to list */}
      <div className="mt-3">
        <AddToListButton productId={product.id} productName={product.name} />
      </div>
    </Link>
  );
}
