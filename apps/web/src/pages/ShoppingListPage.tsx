import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useBasketStore } from "../stores/basket";
import { calculateBasket } from "../lib/api";

interface StoreTotals {
  [storeSlug: string]: {
    total_cents: number;
    total_formatted: string;
    items_available: number;
    items_missing: number;
    missing_products: string[];
  };
}

interface BasketResult {
  totals: StoreTotals;
  recommendation: {
    cheapest_store: string;
    max_savings_cents: number;
    max_savings_formatted: string;
    savings_percentage: number;
    note: string;
  };
}

export function ShoppingListPage() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clear } = useBasketStore();
  const [totals, setTotals] = useState<BasketResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setTotals(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await calculateBasket(
          items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        );
        setTotals(result as BasketResult);
      } catch {
        setTotals(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <span className="text-5xl" aria-hidden="true">🛒</span>
        <h1 className="mt-4 text-2xl font-bold">{t("basket.empty")}</h1>
        <p className="mt-2 text-gray-500">{t("basket.emptyHint")}</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-green-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-800"
        >
          {t("basket.browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("basket.title")}</h1>
        <button onClick={clear} className="text-sm text-red-600 hover:text-red-800">
          {t("basket.clearList")}
        </button>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
          >
            <Link
              to={`/produkt/${item.productId}`}
              className="flex-1 text-sm font-medium hover:text-green-700"
            >
              {item.name}
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                aria-label={t("basket.decreaseQty")}
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                disabled={item.quantity >= 99}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                aria-label={t("basket.increaseQty")}
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.productId)}
                className="ml-2 text-sm text-red-500 hover:text-red-700"
                aria-label={t("basket.removeItem", { name: item.name })}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Store totals */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("basket.priceComparison")}</h2>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded-lg bg-gray-200" />
            <div className="h-20 rounded-lg bg-gray-200" />
          </div>
        ) : totals ? (
          <div className="space-y-3">
            {Object.entries(totals.totals)
              .sort((a, b) => a[1].total_cents - b[1].total_cents)
              .map(([slug, store]) => {
                const isCheapest = slug === totals.recommendation.cheapest_store;
                return (
                  <div
                    key={slug}
                    className={`rounded-lg border-2 p-4 ${
                      isCheapest ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold capitalize">{slug}</span>
                        {isCheapest && (
                          <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            {t("basket.cheapest")}
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-bold">{store.total_formatted}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {t("basket.available", {
                        available: store.items_available,
                        total: store.items_available + store.items_missing,
                      })}
                    </div>
                    {store.missing_products.length > 0 && (
                      <div className="mt-1 text-xs text-red-500">
                        {t("product.notAvailableList", { products: store.missing_products.join(", ") })}
                      </div>
                    )}
                  </div>
                );
              })}

            {totals.recommendation.max_savings_cents > 0 && (
              <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-800">
                <span className="font-medium">
                  {t("basket.savings", { amount: totals.recommendation.max_savings_formatted })}
                </span>
                <span className="ml-1">({totals.recommendation.savings_percentage}%)</span>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
