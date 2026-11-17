import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === "de" ? "en" : "de";

  return (
    <button
      type="button"
      onClick={() => {
        i18n.changeLanguage(next);
        try { localStorage.setItem("sparfuchs-lang", next); } catch { /* private mode */ }
        document.documentElement.lang = next;
      }}
      className="flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line px-2 text-sm font-bold text-ink-muted transition hover:bg-canvas hover:text-ink"
      aria-label={next === "en" ? "Switch to English" : "Auf Deutsch umschalten"}
      lang={next}
    >
      {next.toUpperCase()}
    </button>
  );
}
