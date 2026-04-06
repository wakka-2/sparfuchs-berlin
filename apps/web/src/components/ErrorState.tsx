import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 p-8 text-center">
      <p className="text-lg font-medium text-red-800">{t("common.error")}</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
