export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="h-44 bg-canvas" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-canvas" />
        <div className="h-16 rounded-xl bg-canvas" />
        <div className="h-3 w-1/2 rounded bg-canvas" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-surface" />
      ))}
    </div>
  );
}
