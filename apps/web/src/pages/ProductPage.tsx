import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { fetchProduct } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { SavingsBadge } from "../components/SavingsBadge";
import { AddToListButton } from "../components/AddToListButton";
import { PriceHistory } from "../components/PriceHistory";
import { ErrorState } from "../components/ErrorState";

export function ProductPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: product, loading, error } = useApi(() => fetchProduct(id!), [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-48 rounded-xl bg-gray-200" />
        <div className="flex gap-4">
          <div className="h-24 w-1/2 rounded-lg bg-gray-200" />
          <div className="h-24 w-1/2 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;
  if (!product) return <ErrorState message={t("common.noResults")} />;

  const dateFmt = i18n.language === "de" ? "de-DE" : "en-GB";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/" className="hover:text-green-700">
          {t("common.home")}
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/kategorie/${product.category.slug}`} className="hover:text-green-700">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      {/* Product header */}
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex h-48 w-full items-center justify-center rounded-xl bg-gray-100 sm:h-56 sm:w-56">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-auto object-contain" />
          ) : (
            <span className="text-5xl text-gray-300">📦</span>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.name_de !== product.name_en && product.name_en && (
            <p className="text-sm text-gray-500">{product.name_en}</p>
          )}
          <p className="text-sm text-gray-500">
            {t("product.unit")}: {product.default_unit}
          </p>
          {product.savings && <SavingsBadge savings={product.savings} />}
          <div className="max-w-xs">
            <AddToListButton productId={product.id} productName={product.name} />
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t("product.priceComparison")}</h2>
        {product.prices.length === 0 ? (
          <p className="text-gray-500">{t("product.noPrices")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {product.prices.map((price) => (
              <div
                key={price.store_slug}
                className="rounded-xl border-2 p-4"
                style={{ borderColor: price.store_color ?? "#ddd" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold" style={{ color: price.store_color ?? "#333" }}>
                    {price.store_name}
                  </span>
                  {price.is_cheapest && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {t("product.cheaper")}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-3xl font-bold">{price.price_formatted}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {price.unit_size} &middot; {price.unit_price_formatted}
                </div>
                {price.external_name && (
                  <p className="mt-2 text-xs text-gray-400">{price.external_name}</p>
                )}
                {price.external_url && (
                  <a
                    href={price.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-green-700 hover:underline"
                  >
                    {t("product.viewInShop")}
                  </a>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  {t("product.updated")}: {new Date(price.fetched_at).toLocaleDateString(dateFmt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Price history */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t("history.title")}</h2>
        <PriceHistory productId={product.id} />
      </section>
    </div>
  );
}
