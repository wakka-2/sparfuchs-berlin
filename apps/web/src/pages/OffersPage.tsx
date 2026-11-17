import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { fetchOffers, type OfferType, type StoreOffer } from "../lib/api";
import { formatBasePrice } from "../lib/format";
import { StoreBadge } from "../components/StoreBadge";
import { PriceKind } from "../components/PriceKind";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";
import { track } from "../lib/analytics";

const STORES = [
  { slug: "rewe", name: "REWE" },
  { slug: "penny", name: "Penny" },
  { slug: "aldi-nord", name: "Aldi Nord" },
  { slug: "kaufland", name: "Kaufland" },
];

/**
 * Everything the stores publish, not only the products we compare: all weekly
 * offers, and Aldi Nord's everyday range. Filters live in the URL so a
 * filtered list can be shared and survives the back button.
 */
export function OffersPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const type: OfferType = params.get("typ") === "sortiment" ? "regular" : "offer";
  const store = params.get("markt") ?? undefined;
  const q = params.get("q") ?? "";

  const [input, setInput] = useState(q);
  const [items, setItems] = useState<StoreOffer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  // The page belongs to one set of filters; new filters start at page 1.
  const filterKey = `${type}|${store ?? ""}|${q}`;
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  const [retry, setRetry] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const update = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    setParams(sp, { replace: true });
  };

  useEffect(() => {
    if (q) track("search", { search_term: q, source: "offers" });
  }, [q]);

  // Debounce typing into the URL; a search needs at least 2 characters.
  useEffect(() => {
    const term = input.trim();
    if (term === q || term.length === 1) return;
    const id = setTimeout(() => update({ q: term || undefined }), 300);
    return () => clearTimeout(id);
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading = the last finished request is not the one the UI is asking for.
  const requestKey = `${filterKey}#${page}#${retry}`;
  const [settled, setSettled] = useState<{ key: string; error?: string }>({ key: "" });
  const pending = settled.key !== requestKey;
  const state = pending ? (page === 1 ? "loading" : "more") : settled.error ? "error" : "done";

  useEffect(() => {
    let cancelled = false;
    fetchOffers({ type, store, q: q || undefined, page })
      .then((r) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? r.offers : [...prev, ...r.offers]));
        setCounts(r.store_counts);
        setTotal(r.pagination.total_items);
        setTotalPages(r.pagination.total_pages);
        setSettled({ key: requestKey });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSettled({ key: requestKey, error: e instanceof Error ? e.message : String(e) });
      });
    return () => { cancelled = true; };
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const storeChips = STORES.filter((s) => type === "offer" || counts[s.slug]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">{t("offers.title")}</h1>
        <p className="mt-1 max-w-2xl text-ink-muted">{t("offers.subtitle")}</p>
      </header>

      <div role="group" aria-label={t("offers.typeLabel")} className="inline-flex rounded-2xl border border-line bg-surface p-1">
        {(["offer", "regular"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={type === k}
            onClick={() => update({ typ: k === "regular" ? "sortiment" : undefined, markt: undefined })}
            className={`min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold transition ${
              type === k ? "bg-brand-700 text-white shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t(k === "offer" ? "offers.tabOffers" : "offers.tabRegular")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <label className="relative block max-w-xl">
          <span className="sr-only">{t("offers.searchLabel")}</span>
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("offers.searchPlaceholder")}
            className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-base outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </label>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!store} onClick={() => update({ markt: undefined })} label={t("common.all")} count={allCount} />
          {storeChips.map((s) => (
            <Chip
              key={s.slug}
              active={store === s.slug}
              onClick={() => update({ markt: s.slug })}
              label={s.name}
              count={counts[s.slug] ?? 0}
            />
          ))}
        </div>
      </div>

      {state === "error" ? (
        <ErrorState message={settled.error ?? ""} onRetry={() => setRetry((n) => n + 1)} />
      ) : state === "loading" ? (
        <ProductGridSkeleton count={8} />
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-muted">
          {q ? t("offers.noMatch", { q }) : t("offers.empty")}
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-subtle" aria-live="polite">
            {t(type === "offer" ? "offers.countOffers" : "offers.countRegular", { count: total })}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((o) => <OfferCard key={o.id} offer={o} lang={i18n.language} />)}
          </ul>
          {page < totalPages && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setPaging({ key: filterKey, page: page + 1 })}
                disabled={state === "more"}
                className="min-h-12 cursor-pointer rounded-xl border border-line bg-surface px-6 font-semibold text-brand-800 transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-50"
              >
                {state === "more" ? t("common.loading") : t("offers.loadMore", { count: total - items.length })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
        active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-surface text-ink-muted hover:border-brand-200 hover:text-ink"
      }`}
    >
      {label}
      <span className={`tabular rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-canvas"}`}>{count}</span>
    </button>
  );
}

function OfferCard({ offer, lang }: { offer: StoreOffer; lang: string }) {
  const { t } = useTranslation();
  const base = offer.base_text ? formatBasePrice(offer.base_text) : "";
  const body = (
    <>
      <div className="flex h-32 items-center justify-center bg-white p-3 sm:h-40">
        {offer.image_url ? (
          <img src={offer.image_url} alt="" width={160} height={128} loading="lazy" className="h-full w-auto max-w-full object-contain" />
        ) : (
          <Icon name="package" className="h-10 w-10 text-line" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-line p-3">
        <span className="text-xs"><StoreBadge name={offer.store_name} color={offer.store_color} /></span>
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{offer.name}</h2>
        <p className="tabular font-display text-xl font-bold text-brand-800">{offer.price_formatted}</p>
        <p className="line-clamp-1 text-xs text-ink-muted" title={offer.unit_text}>{offer.unit_text}</p>
        {base && <p className="tabular text-xs text-ink-muted">{base}</p>}
        <PriceKind price={offer} lang={lang} className="mt-auto pt-1" />
      </div>
    </>
  );
  const cls = "flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5";
  return (
    <li>
      {offer.url ? (
        <a href={offer.url} onClick={() => track("view_offer", { store: offer.store_slug, item_name: offer.name })} target="_blank" rel="noopener noreferrer" className={cls} aria-label={t("offers.openAt", { name: offer.name, store: offer.store_name })}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
