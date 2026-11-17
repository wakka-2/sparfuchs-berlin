import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { fetchProduct } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { AddToListButton } from "../components/AddToListButton";
import { PriceHistory } from "../components/PriceHistory";
import { ErrorState } from "../components/ErrorState";
import { StoreBadge } from "../components/StoreBadge";
import { Icon } from "../components/Icon";
import { PriceKind } from "../components/PriceKind";
import { priceLines, isLoose } from "../lib/format";
import { track } from "../lib/analytics";
import { categoryIcon } from "../lib/categoryIcon";

export function ProductPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: product, loading, error } = useApi(() => fetchProduct(id!), [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-surface" />
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="h-72 rounded-3xl bg-surface" />
          <div className="space-y-3"><div className="h-24 rounded-2xl bg-surface" /><div className="h-24 rounded-2xl bg-surface" /></div>
        </div>
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!product) return <ErrorState message={t("common.noResults")} />;

  const best = product.prices[0];
  const maxUnit = Math.max(...product.prices.map((p) => p.unit_price_cents), 1);
  const image = best?.store_image_url ?? product.image_url;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-ink-subtle">
        <Link to="/" className="rounded px-1 hover:text-brand-700">{t("common.home")}</Link>
        <Icon name="chevronRight" className="h-4 w-4" />
        <Link to={`/kategorie/${product.category.slug}`} className="rounded px-1 hover:text-brand-700">{product.category.name}</Link>
        <Icon name="chevronRight" className="h-4 w-4" />
        <span aria-current="page" className="px-1 text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="flex h-72 items-center justify-center rounded-3xl border border-line bg-white p-6">
          {image ? (
            <img src={image} alt={best?.external_name ?? product.name} className="max-h-full w-auto object-contain" />
          ) : (
            <Icon name={categoryIcon(product.category.slug)} className="h-16 w-16 text-line" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">{product.name}</h1>
            {i18n.language === "de" && product.name_en && <p className="mt-1 text-ink-subtle">{product.name_en}</p>}
          </div>

          {best ? (
            <div className="rounded-2xl bg-brand-800 p-5 text-white">
              <p className="text-sm text-brand-200">{t("product.bestThisWeek")}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="tabular font-display text-4xl font-bold">{priceLines(best).main}</span>
                <span className="text-lg">{t("search.at")} {best.store_name}</span>
              </p>
              <p className="tabular mt-1 text-brand-100">{priceLines(best).sub ?? t("product.loose")}</p>
              {product.savings && product.savings.percentage >= 1 && (
                <p className="mt-2 inline-flex rounded-full bg-deal-500 px-3 py-1 text-sm font-bold text-ink">
                  {t("product.savingVsDearest", { pct: Math.round(product.savings.percentage) })}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-5 text-ink-muted">
              <p className="font-semibold text-ink">{t("product.noOfferTitle")}</p>
              <p className="mt-1 text-sm">{t("product.noOfferHint")}</p>
            </div>
          )}

          <div className="max-w-sm"><AddToListButton productId={product.id} productName={product.name} /></div>
        </div>
      </div>

      {product.prices.length > 0 && (
        <section aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="text-2xl font-semibold">{t("product.priceComparison")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("product.compareHint")}</p>
          <ol className="mt-4 space-y-3">
            {product.prices.map((price, i) => (
              <li
                key={price.store_slug}
                className={`rounded-2xl border bg-surface p-4 sm:p-5 ${i === 0 ? "border-brand-500 ring-1 ring-brand-500" : "border-line"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg"><StoreBadge name={price.store_name} color={price.store_color} strong /></span>
                      {i === 0 && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-800">
                          {t("product.cheapest")}
                        </span>
                      )}
                    </div>
                    {price.external_name && <p className="mt-1 font-medium">{price.external_name}</p>}
                    <p className="tabular text-sm text-ink-muted">{isLoose(price.unit_size) ? t("product.loose") : price.unit_size}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-display text-2xl font-bold">{priceLines(price).main}</p>
                    {!isLoose(price.unit_size) && <p className="tabular text-sm font-semibold text-ink-muted">{price.unit_price_formatted}</p>}
                    <PriceKind price={price} lang={i18n.language} className="mt-0.5 justify-end" />
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${i === 0 ? "bg-brand-500" : "bg-ink-subtle/40"}`}
                    style={{ width: `${Math.max(8, (price.unit_price_cents / maxUnit) * 100)}%` }}
                  />
                </div>
                {price.external_url && (
                  <a
                    href={price.external_url}
                    onClick={() => track("view_offer", { store: price.store_slug, item_name: product.name })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
                  >
                    {t("product.viewOffer", { store: price.store_name })}
                    <Icon name="external" className="h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 text-2xl font-semibold">{t("history.title")}</h2>
        <PriceHistory productId={product.id} />
      </section>
    </div>
  );
}
