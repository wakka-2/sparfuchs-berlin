import { useTranslation } from "react-i18next";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-lg font-semibold text-red-900">{t("common.error")}</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry ?? (() => window.location.reload())}
        className="mt-4 min-h-11 cursor-pointer rounded-xl bg-red-700 px-5 font-semibold text-white hover:bg-red-800"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
