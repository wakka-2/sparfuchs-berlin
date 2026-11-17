import { useTranslation } from "react-i18next";
import { fetchProducts, fetchCategories, type Product } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { formatValidUntil } from "../lib/format";
import { ProductCard } from "../components/ProductCard";
import { CategoryNav } from "../components/CategoryNav";
import { StoreBadge } from "../components/StoreBadge";
import { ProductGridSkeleton, CategoryNavSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";
import { categoryIcon } from "../lib/categoryIcon";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const categories = useApi(() => fetchCategories(), []);
  const products = useApi(() => fetchProducts({ limit: 100 }), []);

  const all = products.data?.products ?? [];
  const onOffer = all.filter((p) => p.prices.length > 0);
  const notOnOffer = all.filter((p) => p.prices.length === 0);
  const topSavings = [...onOffer]
    .filter((p) => (p.savings?.percentage ?? 0) >= 5)
    .sort((a, b) => (b.savings?.percentage ?? 0) - (a.savings?.percentage ?? 0))
    .slice(0, 4);

  const stores = new Map<string, { name: string; color: string | null }>();
  for (const p of onOffer) for (const pr of p.prices) stores.set(pr.store_slug, { name: pr.store_name, color: pr.store_color });
  const validUntil = onOffer.flatMap((p) => p.prices.map((pr) => pr.valid_until)).filter(Boolean).sort()[0];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-800 px-5 py-6 text-white sm:px-10 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-600/50" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 hidden h-48 w-48 rounded-full bg-deal-500/25 sm:block" />
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-brand-100">
            <Icon name="sparkles" className="h-4 w-4" />
            {validUntil
              ? t("home.weekBadge", { date: formatValidUntil(validUntil, i18n.language) })
              : t("home.weekBadgeNoDate")}
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-tight sm:text-5xl">{t("home.title")}</h1>
          <p className="mt-2 max-w-xl text-base text-brand-100 sm:text-lg">{t("home.subtitle")}</p>
          {products.data && (
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-sm text-brand-200">{t("home.statProducts")}</dt>
                <dd className="tabular font-display text-2xl font-bold">{onOffer.length} / {all.length}</dd>
              </div>
              <div>
                <dt className="text-sm text-brand-200">{t("home.statStores")}</dt>
                <dd className="tabular font-display text-2xl font-bold">{stores.size}</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* Categories */}
      <section aria-labelledby="cat-heading" className="space-y-3">
        <h2 id="cat-heading" className="sr-only">{t("common.categories")}</h2>
        {categories.loading ? <CategoryNavSkeleton /> : categories.error ? <ErrorState message={categories.error} /> : (
          <CategoryNav categories={categories.data ?? []} />
        )}
        {stores.size > 0 && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-ink-subtle">{t("home.comparing")}</span>
            {[...stores.values()].map((s) => <StoreBadge key={s.name} name={s.name} color={s.color} />)}
          </p>
        )}
      </section>

      {products.loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.error ? (
        <ErrorState message={products.error} />
      ) : all.length === 0 ? (
        <p className="py-12 text-center text-ink-muted">{t("home.noProducts")}</p>
      ) : (
        <>
          {topSavings.length > 0 && (
            <section aria-labelledby="top-heading">
              <SectionHeading id="top-heading" icon="trophy" title={t("home.topSavings")} hint={t("home.topSavingsHint")} />
              <Grid products={topSavings} />
            </section>
          )}

          {groupByCategory(onOffer, categories.data ?? []).map((group) => (
            <section key={group.slug} aria-labelledby={`cat-${group.slug}`}>
              <SectionHeading
                id={`cat-${group.slug}`}
                icon={categoryIcon(group.slug)}
                title={group.name}
                hint={t("home.onOfferCount", { count: group.products.length })}
              />
              <Grid products={group.products} />
            </section>
          ))}

          {notOnOffer.length > 0 && (
            <section aria-labelledby="none-heading" className="rounded-2xl border border-dashed border-line bg-surface/60 p-5">
              <h2 id="none-heading" className="text-lg font-semibold">{t("home.notOnOffer")}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t("home.notOnOfferHint")}</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {notOnOffer.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeading({ id, icon, title, hint }: { id: string; icon: Parameters<typeof Icon>[0]["name"]; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="flex items-center gap-3 text-xl font-semibold sm:text-2xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800" aria-hidden="true">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        {title}
      </h2>
      {hint && <span className="text-sm text-ink-subtle">{hint}</span>}
    </div>
  );
}

function Grid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

function groupByCategory(products: Product[], categories: Array<{ slug: string; sort_order: number }>) {
  const order = new Map(categories.map((c) => [c.slug, c.sort_order]));
  const groups = new Map<string, { slug: string; name: string; products: Product[] }>();
  for (const p of products) {
    const g = groups.get(p.category.slug) ?? { slug: p.category.slug, name: p.category.name, products: [] };
    g.products.push(p);
    groups.set(p.category.slug, g);
  }
  return [...groups.values()].sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
}
