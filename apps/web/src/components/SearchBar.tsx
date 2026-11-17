import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { searchProducts, type SearchResult } from "../lib/api";
import { formatCents } from "../lib/format";
import { Icon } from "./Icon";


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
      <form onSubmit={handleSubmit} role="search" className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
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
          className="h-11 w-full rounded-xl border border-line bg-canvas pl-11 pr-3 text-base text-ink placeholder:text-ink-subtle transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
          aria-label={t("common.search")}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          enterKeyHint="search"
          role="combobox"
        />
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <ul
          id="search-suggestions"
          className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-white py-1 shadow-xl shadow-brand-900/10"
          role="listbox"
        >
          {results.map((result, index) => (
            <li
              key={result.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex min-h-11 cursor-pointer items-center px-4 text-base ${
                index === activeIndex ? "bg-brand-50 text-brand-900" : "hover:bg-canvas"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                setOpen(false);
                navigate(`/produkt/${result.id}`);
              }}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="font-medium">{result.name}</span>
                {result.cheapest_price_cents != null && (
                  <span className="tabular text-sm font-semibold text-brand-700">
                    {t("search.from")} {formatCents(result.cheapest_price_cents)}
                  </span>
                )}
              </div>
            </li>
          ))}
          <li className="border-t border-line px-4 py-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/suche?q=${encodeURIComponent(query)}`);
              }}
              className="min-h-11 w-full cursor-pointer text-left text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("search.showAll")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
