import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Product } from "../lib/api";
import { AddToListButton } from "./AddToListButton";
import { StoreBadge } from "./StoreBadge";
import { packPrefix } from "../lib/format";
import { Icon } from "./Icon";
import { categoryIcon } from "../lib/categoryIcon";
import { PriceKind } from "./PriceKind";

/**
 * One catalog product. The headline is the best price *per kg / L / piece*
 * this week — pack sizes differ between stores, so pack prices alone mislead.
 */
export function ProductCard({ product }: { product: Product }) {
  const { i18n } = useTranslation();
  const [best, ...others] = product.prices; // API sorts by unit price
  const image = best?.store_image_url ?? product.image_url;
  const saving = product.savings && product.savings.percentage >= 5 ? Math.round(product.savings.percentage) : null;

  if (!best) {
    return (
      <Link
        to={`/produkt/${product.id}`}
        className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-ink-muted transition hover:border-brand-200 hover:text-ink"
      >
        <Icon name={categoryIcon(product.category.slug)} className="h-4 w-4 shrink-0 text-ink-subtle" />
        <span className="truncate text-sm font-medium">{product.name}</span>
      </Link>
    );
  }

  return (
    <article className="group relative flex animate-rise overflow-hidden rounded-2xl sm:flex-col border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
      <div className="relative w-32 shrink-0 sm:w-auto">
        <Link
          to={`/produkt/${product.id}`}
          className="flex h-full min-h-36 items-center justify-center bg-white p-3 sm:h-44 sm:p-4"
          aria-label={product.name}
          tabIndex={-1}
        >
          {image ? (
            <img
              src={image}
              alt=""
              width={176}
              height={144}
              loading="lazy"
              className="h-full w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <Icon name={categoryIcon(product.category.slug)} className="h-12 w-12 text-line" />
          )}
        </Link>
        {saving !== null && (
          <span className="absolute bottom-2 left-2 rounded-full bg-deal-500 px-2 py-0.5 text-xs font-bold text-ink shadow-sm sm:bottom-auto sm:left-3 sm:top-3 sm:px-2.5 sm:py-1">
            −{saving} % / {best.unit_price_formatted.split("/")[1]}
          </span>
        )}
        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <AddToListButton productId={product.id} productName={product.name} variant="icon" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 border-l border-line p-3 sm:gap-3 sm:border-l-0 sm:border-t sm:p-4">
        <div>
          <h3 className="text-base font-semibold leading-snug">
            <Link to={`/produkt/${product.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
          {best.external_name && best.external_name.toLowerCase() !== product.name.toLowerCase() && (
            <p className="mt-0.5 line-clamp-1 text-sm text-ink-subtle" title={best.external_name}>
              {best.external_name}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-brand-50 px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="tabular font-display text-xl font-bold text-brand-800 sm:text-2xl">{best.price_formatted}</span>
            <span className="text-sm text-brand-800"><StoreBadge name={best.store_name} color={best.store_color} strong /></span>
          </div>
          <p className="tabular mt-0.5 text-sm text-ink-muted">
            {packPrefix(best.unit_size)}<span className="font-semibold text-ink">{best.unit_price_formatted}</span>
          </p>
        </div>

        {others.length > 0 && (
          <ul className="space-y-1 text-sm">
            {others.map((p) => (
              <li key={p.store_slug} className="flex items-center justify-between gap-2">
                <StoreBadge name={p.store_name} color={p.store_color} />
                <span className="tabular text-right">
                  <span className="font-semibold text-ink">{p.price_formatted}</span>
                  <span className="text-ink-subtle"> · {p.unit_price_formatted}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <PriceKind price={best} lang={i18n.language} className="mt-auto pt-1" />
      </div>
    </article>
  );
}
