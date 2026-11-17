import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { FeaturedOffer } from "../lib/featured";
import { formatValidUntil } from "../lib/format";
import { AddToListButton } from "./AddToListButton";
import { Icon } from "./Icon";
import { track } from "../lib/analytics";

const INTERVAL_MS = 5000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The week's best flyer deals, one per slide, switching every 5 seconds.
 * Auto-rotation stops on hover, keyboard focus, a hidden tab, the pause
 * button, or when the visitor asked the OS for reduced motion (WCAG 2.2.2).
 */
export function FeaturedCarousel({ offers }: { offers: FeaturedOffer[] }) {
  const { t, i18n } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = offers.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || hovered || focused) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, hovered, focused, index]);

  if (count === 0) return null;
  const active = Math.min(index, count - 1);

  return (
    <section
      aria-roledescription={t("featured.carousel")}
      aria-label={t("featured.title")}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="overflow-hidden rounded-3xl bg-brand-800 text-white">
        {/* Slides are stacked; only the active one is visible and reachable. */}
        <div className="grid">
          {offers.map((o, i) => {
            const isActive = i === active;
            const image = o.best.store_image_url ?? o.product.image_url;
            const unit = o.best.unit_price_formatted.split("/")[1];
            return (
              <div
                key={o.product.id}
                role="group"
                aria-roledescription={t("featured.slide")}
                aria-label={t("featured.slideOf", { n: i + 1, count })}
                aria-hidden={!isActive}
                inert={!isActive}
                className={`col-start-1 row-start-1 grid gap-4 p-4 transition-opacity duration-500 motion-reduce:transition-none sm:grid-cols-[1fr_minmax(0,18rem)] sm:items-center sm:gap-8 sm:p-9 ${
                  isActive ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="order-2 min-w-0 sm:order-1">
                  <p className="inline-flex items-center gap-2 rounded-full bg-deal-500 px-3 py-1 text-sm font-bold text-ink">
                    <Icon name="sparkles" className="h-4 w-4" />
                    {t("featured.badge", { pct: o.pct, unit })}
                  </p>
                  <h2 className="mt-2 text-xl font-bold leading-tight sm:mt-3 sm:text-4xl">{o.product.name}</h2>
                  {o.best.external_name && (
                    <p className="mt-1 line-clamp-1 text-brand-100" title={o.best.external_name}>{o.best.external_name}</p>
                  )}
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-4">
                    <span className="tabular font-display text-3xl font-bold sm:text-5xl">{o.best.unit_price_formatted}</span>
                    <span className="text-lg text-brand-100">{t("featured.at", { store: o.best.store_name })}</span>
                  </p>
                  <p className="tabular mt-1 text-sm text-brand-100">
                    {t("featured.instead", { price: o.dearest.unit_price_formatted, store: o.dearest.store_name })}
                    {o.best.valid_until && ` · ${t("product.offerUntil", { date: formatValidUntil(o.best.valid_until, i18n.language) })}`}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5">
                    <Link
                      to={`/produkt/${o.product.id}`}
                      onClick={() => track("select_promotion", { promotion_name: o.product.name, creative_slot: i + 1 })}
                      className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-brand-800 transition hover:bg-brand-50"
                    >
                      {t("featured.cta")}
                      <Icon name="chevronRight" className="h-4 w-4" />
                    </Link>
                    <AddToListButton productId={o.product.id} productName={o.product.name} variant="icon" />
                  </div>
                </div>
                <div className="order-1 flex h-32 items-center justify-center rounded-2xl bg-white p-3 sm:order-2 sm:h-64 sm:p-4">
                  {image ? (
                    <img src={image} alt="" width={256} height={224} className="h-full w-auto max-w-full object-contain" loading={i === 0 ? "eager" : "lazy"} />
                  ) : (
                    <Icon name="tag" className="h-16 w-16 text-line" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t("featured.play") : t("featured.pause")}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
          >
            <Icon name={paused ? "play" : "pause"} className="h-4 w-4" />
          </button>
          {offers.map((o, i) => (
            <button
              key={o.product.id}
              type="button"
              onClick={() => go(i)}
              aria-label={t("featured.goTo", { n: i + 1, name: o.product.name })}
              aria-current={i === active}
              className="group flex h-11 w-7 cursor-pointer items-center justify-center"
            >
              <span
                className={`block h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  i === active ? "w-6 bg-brand-700" : "w-2.5 bg-line group-hover:bg-ink-subtle"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
