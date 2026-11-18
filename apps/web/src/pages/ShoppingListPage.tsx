import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useBasketStore } from "../stores/basket";
import { calculateBasket } from "../lib/api";
import { Icon } from "../components/Icon";
import { formatCents } from "../lib/format";
import { pickOneStore } from "../lib/oneStore";

/** Cheapest store per item this week, grouped by store — the real best buy. */
function splitPlan(result: BasketResult, listNames: Map<string, string>) {
  const byStore = new Map<string, { slug: string; name: string; items: string[] }>();
  // The API leaves out items that no store has on offer this week.
  const priced = new Set(result.items.map((i) => i.product_id));
  const unavailable = [...listNames].filter(([id]) => !priced.has(id)).map(([, name]) => name);
  let total = 0;
  for (const item of result.items) {
    const entries = Object.entries(item.prices);
    if (entries.length === 0) continue;
    const [slug, price] = entries.reduce((a, b) => (b[1].subtotal_cents < a[1].subtotal_cents ? b : a));
    total += price.subtotal_cents;
    const g = byStore.get(slug) ?? { slug, name: result.totals[slug]?.store_name ?? slug, items: [] };
    g.items.push(item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name);
    byStore.set(slug, g);
  }
  return { total, unavailable, stores: [...byStore.values()].sort((a, b) => b.items.length - a.items.length) };
}

interface StoreTotal {
  store_name: string;
  total_cents: number;
  total_formatted: string;
  items_available: number;
  items_missing: number;
  missing_products: string[];
}

interface BasketResult {
  items: Array<{ product_id: string; name: string; quantity: number; prices: Record<string, { subtotal_cents: number }> }>;
  totals: Record<string, StoreTotal>;
  recommendation: {
    cheapest_store: string;
    cheapest_complete_store: string | null;
    max_savings_cents: number;
    max_savings_formatted: string;
  };
}

export function ShoppingListPage() {
  const { t, i18n } = useTranslation();
  const { items, removeItem, updateQuantity, clear } = useBasketStore();
  const [result, setResult] = useState<BasketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [noneOnOffer, setNoneOnOffer] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setResult(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      setNoneOnOffer(false);
      try {
        setResult((await calculateBasket(
          items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        )) as BasketResult);
      } catch (err) {
        // 404 = nothing on the list is on offer anywhere this week — not an outage.
        if (/No valid products/.test(String(err))) { setResult(null); setNoneOnOffer(true); }
        else setFailed(true);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-800" aria-hidden="true">
          <Icon name="list" className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">{t("basket.empty")}</h1>
        <p className="mt-2 text-ink-muted">{t("basket.emptyHint")}</p>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
          {t("basket.browseProducts")}
        </Link>
      </div>
    );
  }

  const plan = result ? splitPlan(result, new Map(items.map((i) => [i.productId, i.name]))) : null;
  const oneStore = result ? pickOneStore(result, items.length) : null;

  // Ranking only means something among stores that have every item.
  const totals = result
    ? Object.entries(result.totals).sort(
        (a, b) => a[1].items_missing - b[1].items_missing || a[1].total_cents - b[1].total_cents,
      )
    : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-labelledby="list-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 id="list-heading" className="text-3xl font-bold">{t("basket.title")}</h1>
          <button
            type="button"
            onClick={() => { if (window.confirm(t("basket.clearConfirm"))) clear(); }}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <Icon name="trash" className="h-4 w-4" />
            {t("basket.clearList")}
          </button>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3 px-4 py-2">
              <Link to={`/produkt/${item.productId}`} className="min-w-0 flex-1 py-2 font-semibold hover:text-brand-700">
                {item.name}
              </Link>
              <div className="flex items-center rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("basket.decreaseQty")}
                >
                  <Icon name="minus" className="h-4 w-4" />
                </button>
                <span className="tabular w-8 text-center font-semibold" aria-live="polite">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= 99}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("basket.increaseQty")}
                >
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-ink-subtle hover:bg-red-50 hover:text-red-700"
                aria-label={t("basket.removeItem", { name: item.name })}
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside aria-labelledby="totals-heading" className="lg:sticky lg:top-24 lg:self-start">
        <h2 id="totals-heading" className="mb-1 text-xl font-semibold">{t("basket.priceComparison")}</h2>
        <p className="mb-4 text-sm text-ink-muted">{t("basket.compareHint")}</p>
        {loading && !result ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}</div>
        ) : noneOnOffer ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface p-4 text-sm text-ink-muted">{t("basket.noneOnOffer")}</p>
        ) : failed ? (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{t("basket.failed")}</p>
        ) : (
          <>
          {oneStore && (
            <div className="mb-4 rounded-2xl border-2 border-brand-500 bg-surface p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                <Icon name="store" className="h-4 w-4" />
                {t("basket.oneStoreTitle")}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{oneStore.storeName}</p>
              <p className="tabular mt-1 text-ink">
                {t("basket.oneStoreCoverage", { covered: oneStore.covered, total: oneStore.listSize })}
                {" · "}
                <span className="font-semibold">{formatCents(oneStore.totalCents, i18n.language)}</span>
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {oneStore.extraCents > 0
                  ? t("basket.oneStoreExtra", { extra: formatCents(oneStore.extraCents, i18n.language) })
                  : t("basket.oneStoreNoExtra")}
              </p>
              {oneStore.missing.length > 0 && (
                <p className="mt-1 text-sm text-ink-muted">{t("basket.oneStoreMissing", { products: oneStore.missing.join(", ") })}</p>
              )}
              <p className="mt-3 border-t border-line pt-3 text-xs text-ink-subtle">{t("basket.oneStoreCaveat")}</p>
            </div>
          )}
          {plan && plan.stores.length > 0 && (
            <div className="mb-4 rounded-2xl bg-brand-800 p-5 text-white">
              <p className="text-sm text-brand-200">{t("basket.splitTitle")}</p>
              <p className="tabular font-display text-3xl font-bold">{formatCents(plan.total, i18n.language)}</p>
              {plan.stores.length > 1 && <p className="mt-1 text-sm text-brand-100">{t("basket.splitHint", { count: plan.stores.length })}</p>}
              <ul className="mt-3 space-y-2 border-t border-white/15 pt-3 text-sm">
                {plan.stores.map((s) => (
                  <li key={s.slug}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-brand-100">: {s.items.join(", ")}</span>
                  </li>
                ))}
              </ul>
              {plan.unavailable.length > 0 && (
                <p className="mt-3 text-sm text-brand-200">{t("basket.noOfferFor", { products: plan.unavailable.join(", ") })}</p>
              )}
            </div>
          )}
          <ol className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {totals.map(([slug, s]) => {
              const best = slug === result?.recommendation.cheapest_complete_store;
              return (
                <li key={slug} className={`rounded-2xl border p-4 ${best ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-line bg-surface"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg font-semibold">{s.store_name}</span>
                    <span className="tabular font-display text-2xl font-bold">{s.total_formatted}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("basket.available", { available: s.items_available, total: s.items_available + s.items_missing })}
                    {best && <span className="ml-2 font-bold text-brand-800">· {t("basket.cheapest")}</span>}
                  </p>
                  {s.missing_products.length > 0 && (
                    <p className="mt-1 text-sm text-ink-subtle">{t("product.notAvailableList", { products: s.missing_products.join(", ") })}</p>
                  )}
                </li>
              );
            })}
          </ol>
          </>
        )}
      </aside>
    </div>
  );
}
