import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { fetchProducts, fetchCategories } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { ProductCard } from "../components/ProductCard";
import { CategoryNav } from "../components/CategoryNav";
import { ProductGridSkeleton, CategoryNavSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

export function CategoryPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const { data: categoriesData, loading: catLoading } = useApi(
    () => fetchCategories(),
    [],
  );

  const { data: productsData, loading: prodLoading, error: prodError } = useApi(
    () => fetchProducts({ category: slug, limit: 50 }),
    [slug],
  );

  const currentCategory = categoriesData?.find((c) => c.slug === slug);

  return (
    <div className="space-y-6">
      <section>
        {catLoading ? (
          <CategoryNavSkeleton />
        ) : (
          <CategoryNav categories={categoriesData ?? []} />
        )}
      </section>

      <div>
        <h1 className="text-2xl font-bold">
          {currentCategory?.icon && <span className="mr-2">{currentCategory.icon}</span>}
          {currentCategory?.name ?? slug}
        </h1>
        {currentCategory && (
          <p className="mt-1 text-sm text-gray-500">
            {t("common.productCount", { count: currentCategory.product_count })}
          </p>
        )}
      </div>

      {prodLoading ? (
        <ProductGridSkeleton count={6} />
      ) : prodError ? (
        <ErrorState message={prodError} />
      ) : productsData?.products.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          {t("category.noProducts")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productsData?.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
