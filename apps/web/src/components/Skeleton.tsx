export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 h-24 rounded-lg bg-gray-200" />
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
      <div className="mb-3 h-3 w-1/3 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-16 w-1/2 rounded-lg bg-gray-200" />
        <div className="h-16 w-1/2 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-gray-200" />
      ))}
    </div>
  );
}
