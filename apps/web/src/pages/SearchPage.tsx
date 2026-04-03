import { useSearchParams, Link } from "react-router";
import { searchProducts } from "../lib/api";
import { useApi } from "../hooks/useApi";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " \u20AC";
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const { data: results, loading, error } = useApi(
    () => (query.length >= 2 ? searchProducts(query, 20) : Promise.resolve([])),
    [query],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Suchergebnisse für &ldquo;{query}&rdquo;
      </h1>

      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} />
      ) : results?.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">Keine Ergebnisse gefunden.</p>
          <p className="mt-2 text-sm text-gray-400">
            Versuche es mit einem anderen Suchbegriff.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results?.map((result) => (
            <Link
              key={result.id}
              to={`/produkt/${result.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-md"
            >
              <div>
                <h3 className="font-semibold">{result.name}</h3>
                <p className="text-xs text-gray-500">{result.category_slug}</p>
              </div>
              {result.cheapest_price_cents != null && (
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700">
                    ab {formatCents(result.cheapest_price_cents)}
                  </p>
                  {result.cheapest_store_slug && (
                    <p className="text-xs text-gray-500">
                      bei {result.cheapest_store_slug.charAt(0).toUpperCase() + result.cheapest_store_slug.slice(1)}
                    </p>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
