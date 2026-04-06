import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./de.json";
import en from "./en.json";

const savedLang = typeof window !== "undefined" ? localStorage.getItem("sparfuchs-lang") : null;

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: savedLang ?? "de",
  fallbackLng: "de",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
