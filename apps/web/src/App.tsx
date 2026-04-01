import { Routes, Route } from "react-router";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="/" className="text-lg font-bold text-green-700">
            Sparfuchs Berlin
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:text-green-700">
              Preise
            </a>
            <a href="/liste" className="hover:text-green-700">
              Einkaufsliste
            </a>
            <a href="/ueber-uns" className="hover:text-green-700">
              Info
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ueber-uns" element={<AboutPage />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p>
          Preise von rewe.de und lidl.de. Angaben ohne Gewähr — Preise können im
          Laden abweichen.
        </p>
      </footer>
    </div>
  );
}
