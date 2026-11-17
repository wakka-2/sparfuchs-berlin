import { useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { searchProducts } from "../lib/api";
import { track } from "../lib/analytics";
import { useApi } from "../hooks/useApi";
import { formatCents } from "../lib/format";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";
import { categoryIcon } from "../lib/categoryIcon";

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  useEffect(() => {
    if (query.length >= 2) track("search", { search_term: query, source: "header" });
  }, [query]);
  const { data: results, loading, error } = useApi(
    () => (query.length >= 2 ? searchProducts(query, 20) : Promise.resolve([])),
    [query],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("search.resultsFor")} „{query}“</h1>
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />)}</div>
      ) : error ? (
        <ErrorState message={error} />
      ) : results?.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface py-12 text-center">
          <p className="text-lg font-semibold">{t("common.noResults")}</p>
          <p className="mt-1 text-ink-muted">{t("common.tryDifferent")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {results?.map((r) => (
            <li key={r.id}>
              <Link to={`/produkt/${r.id}`} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-canvas">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800" aria-hidden="true">
                  <Icon name={categoryIcon(r.category_slug)} className="h-5 w-5" />
                </span>
                <span className="flex-1 font-semibold">{r.name}</span>
                {r.cheapest_price_cents != null ? (
                  <span className="tabular text-right font-semibold text-brand-700">
                    {t("search.from")} {formatCents(r.cheapest_price_cents, i18n.language)}
                  </span>
                ) : (
                  <span className="text-sm text-ink-subtle">{t("search.noOffer")}</span>
                )}
                <Icon name="chevronRight" className="h-5 w-5 text-ink-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
