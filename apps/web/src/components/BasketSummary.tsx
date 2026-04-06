import { Link } from "react-router";
import { useBasketStore } from "../stores/basket";

export function BasketSummary() {
  const items = useBasketStore((s) => s.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="text-sm">
          <span className="font-medium">{totalItems} Artikel</span>
          <span className="ml-1 text-gray-500">auf der Liste</span>
        </div>
        <Link
          to="/liste"
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Zur Einkaufsliste
        </Link>
      </div>
    </div>
  );
}
