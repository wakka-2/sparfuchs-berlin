import { Routes, Route, Link, useLocation } from "react-router";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
import { ProductPage } from "./pages/ProductPage";
import { SearchPage } from "./pages/SearchPage";
import { AboutPage } from "./pages/AboutPage";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`text-sm font-medium transition ${
        isActive ? "text-green-700" : "text-gray-600 hover:text-green-700"
      }`}
    >
      {children}
    </Link>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-green-700">
            <span aria-hidden="true">🦊</span>
            <span className="hidden sm:inline">Sparfuchs Berlin</span>
            <span className="sm:hidden">Sparfuchs</span>
          </Link>
          <nav className="flex gap-4">
            <NavLink to="/">Preise</NavLink>
            <NavLink to="/liste">Liste</NavLink>
            <NavLink to="/ueber-uns">Info</NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/kategorie/:slug" element={<CategoryPage />} />
          <Route path="/produkt/:id" element={<ProductPage />} />
          <Route path="/suche" element={<SearchPage />} />
          <Route path="/ueber-uns" element={<AboutPage />} />
          <Route
            path="/liste"
            element={
              <div className="py-12 text-center text-gray-500">
                Einkaufsliste wird in Stage 6 implementiert.
              </div>
            }
          />
          <Route
            path="*"
            element={
              <div className="py-12 text-center">
                <h1 className="text-2xl font-bold">404</h1>
                <p className="mt-2 text-gray-500">Seite nicht gefunden.</p>
                <Link to="/" className="mt-4 inline-block text-green-700 hover:underline">
                  Zur Startseite
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-gray-500">
          <p>
            Preise von rewe.de und lidl.de. Angaben ohne Gewähr — Preise können
            im Laden abweichen.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link to="/ueber-uns" className="hover:text-green-700">Info</Link>
            <span className="text-gray-300">|</span>
            <Link to="/ueber-uns" className="hover:text-green-700">Impressum</Link>
            <span className="text-gray-300">|</span>
            <Link to="/ueber-uns" className="hover:text-green-700">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
