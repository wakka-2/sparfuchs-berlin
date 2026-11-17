import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { fetchProducts, fetchCategories } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { ProductCard } from "../components/ProductCard";
import { CategoryNav } from "../components/CategoryNav";
import { ProductGridSkeleton, CategoryNavSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";
import { categoryIcon } from "../lib/categoryIcon";

export function CategoryPage() {
  const { t } = useTranslation();
  const { slug = "" } = useParams<{ slug: string }>();
  const categories = useApi(() => fetchCategories(), []);
  const products = useApi(() => fetchProducts({ category: slug, limit: 100 }), [slug]);

  const current = categories.data?.find((c) => c.slug === slug);
  const all = products.data?.products ?? [];
  const onOffer = all.filter((p) => p.prices.length > 0);
  const notOnOffer = all.filter((p) => p.prices.length === 0);

  return (
    <div className="space-y-8">
      {categories.loading ? <CategoryNavSkeleton /> : <CategoryNav categories={categories.data ?? []} />}

      <header className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-800" aria-hidden="true">
          <Icon name={categoryIcon(slug)} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">{current?.name ?? slug}</h1>
          {products.data && (
            <p className="text-ink-muted">{t("category.summary", { onOffer: onOffer.length, total: all.length })}</p>
          )}
        </div>
      </header>

      {products.loading ? (
        <ProductGridSkeleton count={4} />
      ) : products.error ? (
        <ErrorState message={products.error} />
      ) : (
        <>
          {onOffer.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {onOffer.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <p className="rounded-2xl border border-line bg-surface p-8 text-center text-ink-muted">{t("category.noOffers")}</p>
          )}
          {notOnOffer.length > 0 && (
            <section aria-labelledby="none-heading">
              <h2 id="none-heading" className="mb-3 text-lg font-semibold">{t("home.notOnOffer")}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {notOnOffer.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
