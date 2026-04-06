import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggle = () => {
    const next = currentLang === "de" ? "en" : "de";
    i18n.changeLanguage(next);
    localStorage.setItem("sparfuchs-lang", next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      aria-label={`Switch to ${currentLang === "de" ? "English" : "Deutsch"}`}
    >
      {currentLang === "de" ? "EN" : "DE"}
    </button>
  );
}
