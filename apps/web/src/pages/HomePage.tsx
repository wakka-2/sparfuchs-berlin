import { useTranslation } from "react-i18next";
import { fetchProducts, fetchCategories } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { ProductCard } from "../components/ProductCard";
import { CategoryNav } from "../components/CategoryNav";
import { ProductGridSkeleton, CategoryNavSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

export function HomePage() {
  const { t } = useTranslation();

  const {
    data: categoriesData,
    loading: catLoading,
    error: catError,
  } = useApi(() => fetchCategories(), []);

  const {
    data: productsData,
    loading: prodLoading,
    error: prodError,
  } = useApi(() => fetchProducts({ limit: 50 }), []);

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <section className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-green-700 to-green-500 px-6 py-5 text-white shadow-md">
        <div>
          <h1 className="text-lg font-bold sm:text-xl">{t("home.title")}</h1>
          <p className="mt-0.5 text-sm text-green-100">{t("home.subtitle")}</p>
        </div>
        <span className="hidden text-5xl sm:block" aria-hidden="true">🦊</span>
      </section>

      {/* Categories nav */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          {t("common.categories")}
        </h2>
        {catLoading ? (
          <CategoryNavSkeleton />
        ) : catError ? (
          <ErrorState message={catError} />
        ) : (
          <CategoryNav categories={categoriesData ?? []} />
        )}
      </section>

      {/* Products grouped by category */}
      {prodLoading ? (
        <ProductGridSkeleton count={6} />
      ) : prodError ? (
        <ErrorState message={prodError} />
      ) : (
        (() => {
          const allProducts = productsData?.products ?? [];
          const withPrices = allProducts.filter((p) => p.prices.length > 0);

          if (allProducts.length === 0) {
            return <p className="text-center text-gray-500">{t("home.noProducts")}</p>;
          }

          // Group products by category slug, preserving category metadata
          const grouped = new Map<string, {
            name: string;
            icon: string | null;
            sortOrder: number;
            products: typeof allProducts;
          }>();

          for (const product of allProducts) {
            const slug = product.category.slug;
            if (!grouped.has(slug)) {
              const cat = categoriesData?.find((c) => c.slug === slug);
              grouped.set(slug, {
                name: product.category.name,
                icon: cat?.icon ?? null,
                sortOrder: cat?.sort_order ?? 99,
                products: [],
              });
            }
            grouped.get(slug)!.products.push(product);
          }

          const sections = [...grouped.values()].sort((a, b) => a.sortOrder - b.sortOrder);

          // Collect unique store names from priced products
          const storeNames = [
            ...new Set(withPrices.flatMap((p) => p.prices.map((pr) => pr.store_name))),
          ];

          return (
            <div className="space-y-2">
              {/* Summary bar */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-bold text-gray-800">
                  {withPrices.length} von {allProducts.length} Produkten mit Preisen
                </span>
                {storeNames.length > 0 && (
                  <>
                    <span className="text-gray-300 select-none">·</span>
                    <div className="flex flex-wrap gap-1.5">
                      {storeNames.map((name) => {
                        const pr = withPrices.flatMap((p) => p.prices).find((p) => p.store_name === name);
                        return (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700 shadow-sm"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: pr?.store_color ?? "#888" }}
                              aria-hidden="true"
                            />
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Category sections */}
              <div className="space-y-8 pt-2">
                {sections.map((section) => (
                  <section key={section.name}>
                    {/* Section header */}
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        {section.icon && (
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow ring-1 ring-gray-100"
                            aria-hidden="true"
                          >
                            {section.icon}
                          </span>
                        )}
                        <h2 className="text-base font-extrabold tracking-tight text-gray-900 sm:text-lg">
                          {section.name}
                        </h2>
                      </div>
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                        {section.products.length}{" "}
                        {section.products.length === 1 ? "Angebot" : "Angebote"}
                      </span>
                    </div>

                    {/* Product grid */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {section.products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>

                    {/* Section bottom rule */}
                    <div className="mt-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </section>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
