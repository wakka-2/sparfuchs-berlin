import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { searchProducts, type SearchResult } from "../lib/api";

function formatCents(cents: number): string {
  return (
    (cents / 100).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " \u20AC"
  );
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      const t = setTimeout(() => {
        setResults([]);
        setOpen(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchProducts(query, 5);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setOpen(false);
      navigate(`/suche?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      setOpen(false);
      navigate(`/produkt/${results[activeIndex].id}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("common.searchPlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
          aria-label={t("common.search")}
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
        />
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <ul
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          role="listbox"
        >
          {results.map((result, index) => (
            <li
              key={result.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === activeIndex ? "bg-green-50 text-green-800" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                setOpen(false);
                navigate(`/produkt/${result.id}`);
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.name}</span>
                {result.cheapest_price_cents != null && (
                  <span className="text-xs text-green-700">
                    {t("search.from")} {formatCents(result.cheapest_price_cents)}
                  </span>
                )}
              </div>
            </li>
          ))}
          <li className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/suche?q=${encodeURIComponent(query)}`);
              }}
              className="w-full text-left text-xs text-green-700 hover:underline"
            >
              {t("search.showAll")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
