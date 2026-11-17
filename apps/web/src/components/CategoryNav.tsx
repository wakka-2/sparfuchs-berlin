import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { Category } from "../lib/api";
import { Icon } from "./Icon";
import { categoryIcon } from "../lib/categoryIcon";

export function CategoryNav({ categories }: { categories: Category[] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const current = location.pathname.startsWith("/kategorie/") ? location.pathname.split("/")[2] : null;

  const chip = (active: boolean) =>
    `flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition duration-200 ${
      active
        ? "border-brand-700 bg-brand-700 text-white"
        : "border-line bg-surface text-ink-muted hover:border-brand-200 hover:text-ink"
    }`;

  return (
    <nav aria-label={t("common.categories")} className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <ul className="flex gap-2">
        <li>
          <Link to="/" className={chip(!current)} aria-current={!current ? "page" : undefined}>
            {t("common.all")}
          </Link>
        </li>
        {categories.map((cat) => (
          <li key={cat.slug}>
            <Link
              to={`/kategorie/${cat.slug}`}
              className={chip(current === cat.slug)}
              aria-current={current === cat.slug ? "page" : undefined}
            >
              <Icon name={categoryIcon(cat.slug)} className="h-4 w-4" />
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
