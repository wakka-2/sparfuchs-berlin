import { Link, useLocation } from "react-router";
import type { Category } from "../lib/api";

interface CategoryNavProps {
  categories: Category[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const location = useLocation();
  const currentSlug = location.pathname.startsWith("/kategorie/")
    ? location.pathname.split("/")[2]
    : null;

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Kategorien">
      <Link
        to="/"
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
          !currentSlug
            ? "border-green-600 bg-green-50 text-green-800"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        role="tab"
        aria-selected={!currentSlug}
      >
        Alle
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          to={`/kategorie/${cat.slug}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
            currentSlug === cat.slug
              ? "border-green-600 bg-green-50 text-green-800"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
          role="tab"
          aria-selected={currentSlug === cat.slug}
        >
          {cat.icon && <span>{cat.icon}</span>}
          {cat.name}
          <span className="text-xs text-gray-400">({cat.product_count})</span>
        </Link>
      ))}
    </nav>
  );
}
