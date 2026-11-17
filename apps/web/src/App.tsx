import { useEffect, useRef } from "react";
import { Routes, Route, Link, NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
import { ProductPage } from "./pages/ProductPage";
import { SearchPage } from "./pages/SearchPage";
import { OffersPage } from "./pages/OffersPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ConsentBanner } from "./components/ConsentBanner";
import { analyticsConfigured, openConsentSettings, trackPageView } from "./lib/analytics";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import { AboutPage } from "./pages/AboutPage";
import { ImpressumPage } from "./pages/ImpressumPage";
import { DatenschutzPage } from "./pages/DatenschutzPage";
import { SearchBar } from "./components/SearchBar";
import { LanguageToggle } from "./components/LanguageToggle";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Icon, type IconName } from "./components/Icon";
import { useBasketStore } from "./stores/basket";

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Sparfuchs Berlin">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white" aria-hidden="true">
        <Icon name="tag" className="h-5 w-5" />
      </span>
      <span className="hidden font-display text-lg font-bold leading-none text-ink sm:block">
        Sparfuchs<span className="text-brand-700"> Berlin</span>
      </span>
    </Link>
  );
}

function useListCount() {
  const items = useBasketStore((s) => s.items);
  return Array.isArray(items) ? items.length : 0;
}

const NAV: Array<{ to: string; icon: IconName; key: string }> = [
  { to: "/", icon: "tag", key: "common.prices" },
  { to: "/angebote", icon: "sparkles", key: "common.offers" },
  { to: "/liste", icon: "list", key: "common.list" },
  { to: "/ueber-uns", icon: "info", key: "common.info" },
];

function TopNav() {
  const { t } = useTranslation();
  const count = useListCount();
  return (
    <nav aria-label={t("common.mainNav")} className="hidden items-center gap-1 md:flex">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end
          className={({ isActive }) =>
            `relative flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
              isActive ? "bg-brand-50 text-brand-800" : "text-ink-muted hover:bg-canvas hover:text-ink"
            }`
          }
        >
          <Icon name={n.icon} className="h-4 w-4" />
          {t(n.key)}
          {n.to === "/liste" && count > 0 && (
            <span className="tabular rounded-full bg-deal-500 px-1.5 text-xs font-bold text-ink">{count}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Thumb-reachable navigation on phones. */
function BottomNav() {
  const { t } = useTranslation();
  const count = useListCount();
  return (
    <nav
      aria-label={t("common.mainNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  isActive ? "text-brand-700" : "text-ink-subtle"
                }`
              }
            >
              <span className="relative">
                <Icon name={n.icon} className="h-6 w-6" />
                {n.to === "/liste" && count > 0 && (
                  <span className="tabular absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-deal-500 px-1 text-center text-[11px] font-bold leading-5 text-ink">
                    {count}
                  </span>
                )}
              </span>
              {t(n.key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** On route change: back to top and move focus to the page for screen readers. */
function useRouteFocus() {
  const { pathname } = useLocation();
  // Single-page app: report each route change as a page view (consent-gated).
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);
  return mainRef;
}

export function App() {
  const { t } = useTranslation();
  const mainRef = useRouteFocus();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[100] rounded-lg bg-brand-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t("common.skipToContent")}
      </a>

      <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Logo />
          <div className="flex-1"><SearchBar /></div>
          <TopNav />
          <LanguageToggle />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 outline-none md:pb-16">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/kategorie/:slug" element={<CategoryPage />} />
            <Route path="/produkt/:id" element={<ProductPage />} />
            <Route path="/suche" element={<SearchPage />} />
            <Route path="/angebote" element={<OffersPage />} />
            <Route path="/pruefen" element={<ReviewPage />} />
            <Route path="/liste" element={<ShoppingListPage />} />
            <Route path="/ueber-uns" element={<AboutPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route
              path="*"
              element={
                <div className="py-16 text-center">
                  <h1 className="text-4xl font-bold">{t("notFound.title")}</h1>
                  <p className="mt-2 text-ink-muted">{t("notFound.message")}</p>
                  <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
                    {t("notFound.goHome")}
                  </Link>
                </div>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>

      <footer className="border-t border-line bg-surface pb-20 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">{t("footer.disclaimer")}</p>
          <div className="flex gap-4">
            <Link to="/ueber-uns" className="hover:text-brand-700">{t("common.info")}</Link>
            <Link to="/impressum" className="hover:text-brand-700">{t("footer.impressum")}</Link>
            <Link to="/datenschutz" className="hover:text-brand-700">{t("footer.privacy")}</Link>
            {analyticsConfigured() && (
              <button type="button" onClick={openConsentSettings} className="cursor-pointer hover:text-brand-700">
                {t("consent.settings")}
              </button>
            )}
          </div>
        </div>
      </footer>

      <BottomNav />
      <ConsentBanner />
    </div>
  );
}
