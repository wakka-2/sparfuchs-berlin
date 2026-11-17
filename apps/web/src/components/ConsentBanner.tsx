import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { analyticsConfigured, readConsent, setConsent } from "../lib/analytics";

/**
 * Asks before any analytics run. "Ablehnen" and "Akzeptieren" are equally
 * prominent, as German regulators require; nothing loads until a choice.
 */
export function ConsentBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => analyticsConfigured() && readConsent() === null);

  useEffect(() => {
    const show = () => setOpen(analyticsConfigured());
    window.addEventListener("sparfuchs:consent-open", show);
    return () => window.removeEventListener("sparfuchs:consent-open", show);
  }, []);

  if (!open) return null;
  const choose = (c: "granted" | "denied") => {
    setConsent(c);
    setOpen(false);
  };

  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-surface p-4 shadow-xl md:bottom-4"
    >
      <h2 id="consent-title" className="text-base font-semibold">{t("consent.title")}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {t("consent.text")}{" "}
        <Link to="/datenschutz" className="font-semibold text-brand-700 underline-offset-2 hover:underline">{t("consent.more")}</Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => choose("denied")} className="min-h-11 cursor-pointer rounded-xl border border-line px-4 font-semibold text-ink hover:bg-canvas">
          {t("consent.decline")}
        </button>
        <button type="button" onClick={() => choose("granted")} className="min-h-11 cursor-pointer rounded-xl border border-line px-4 font-semibold text-ink hover:bg-canvas">
          {t("consent.accept")}
        </button>
      </div>
    </section>
  );
}
