import { useState } from "react";
import { useNavigate } from "react-router";
import { fetchProducts, fetchCategories } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { ProductCard } from "../components/ProductCard";
import { CategoryNav } from "../components/CategoryNav";
import { ProductGridSkeleton, CategoryNavSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const {
    data: categoriesData,
    loading: catLoading,
    error: catError,
  } = useApi(() => fetchCategories(), []);

  const {
    data: productsData,
    loading: prodLoading,
    error: prodError,
  } = useApi(() => fetchProducts({ limit: 12 }), []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/suche?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-xl bg-green-50 p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold text-green-800 sm:text-3xl">
          Supermarkt-Preise vergleichen
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Finde die günstigsten Preise in Berlin — REWE, Lidl und mehr.
        </p>
        <form onSubmit={handleSearch} className="mx-auto mt-5 flex max-w-md gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Produkt suchen... z.B. Milch, Butter"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            aria-label="Produkt suchen"
          />
          <button
            type="submit"
            className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-800"
          >
            Suchen
          </button>
        </form>
      </section>

      {/* Categories */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Kategorien</h2>
        {catLoading ? (
          <CategoryNavSkeleton />
        ) : catError ? (
          <ErrorState message={catError} />
        ) : (
          <CategoryNav categories={categoriesData ?? []} />
        )}
      </section>

      {/* Product Grid */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Alle Produkte</h2>
        {prodLoading ? (
          <ProductGridSkeleton count={6} />
        ) : prodError ? (
          <ErrorState message={prodError} />
        ) : productsData?.products.length === 0 ? (
          <p className="text-center text-gray-500">Noch keine Produkte vorhanden.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productsData?.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
