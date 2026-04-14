import { useTranslation } from "react-i18next";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="prose mx-auto max-w-2xl">
      <h1>{t("about.title")}</h1>
      <p>{t("about.intro")}</p>

      <h2>{t("about.dataSources")}</h2>
      <p>{t("about.dataSourcesText")}</p>

      <h2>{t("about.disclaimer")}</h2>
      <p>{t("about.disclaimerText")}</p>

      <h2>{t("about.feedback")}</h2>
      <p>{t("about.feedbackText")}</p>
      <ul>
        <li>
          <a
            href="mailto:feedback@sparfuchs-berlin.de"
            className="text-green-700 hover:underline"
          >
            feedback@sparfuchs-berlin.de
          </a>
        </li>
        <li>
          <a
            href="https://github.com/wakka-2/sparfuchs-berlin/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 hover:underline"
          >
            GitHub Issues
          </a>
        </li>
      </ul>

      <h2>{t("about.openSource")}</h2>
      <p>
        {t("about.openSourceText")}{" "}
        <a
          href="https://github.com/wakka-2/sparfuchs-berlin"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-700 hover:underline"
        >
          github.com/wakka-2/sparfuchs-berlin
        </a>
        .
      </p>

      <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <strong>{t("about.version")}</strong> v1.0.0 — {t("about.versionDate")}
      </div>
    </div>
  );
}
