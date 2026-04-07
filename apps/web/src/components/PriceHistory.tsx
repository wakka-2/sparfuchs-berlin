import { useTranslation } from "react-i18next";
import { fetchProductHistory, type PriceHistoryEntry } from "../lib/api";
import { useApi } from "../hooks/useApi";

interface PriceHistoryProps {
  productId: string;
}

export function PriceHistory({ productId }: PriceHistoryProps) {
  const { t, i18n } = useTranslation();
  const { data: history, loading } = useApi(
    () => fetchProductHistory(productId),
    [productId],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-20 rounded bg-gray-200" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-gray-400">{t("history.noData")}</p>
    );
  }

  const dateFmt = i18n.language === "de" ? "de-DE" : "en-GB";

  // Group by store for a cleaner display
  const byStore = new Map<string, PriceHistoryEntry[]>();
  for (const entry of history) {
    const existing = byStore.get(entry.store_slug) ?? [];
    existing.push(entry);
    byStore.set(entry.store_slug, existing);
  }

  return (
    <div className="space-y-4">
      {Array.from(byStore.entries()).map(([slug, entries]) => {
        const storeName = entries[0].store_name;
        const storeColor = entries[0].store_color;

        return (
          <div key={slug}>
            <h4
              className="mb-2 text-sm font-semibold"
              style={{ color: storeColor ?? "#333" }}
            >
              {storeName}
            </h4>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{t("history.price")}</th>
                    <th className="px-3 py-2">{t("history.from")}</th>
                    <th className="px-3 py-2">{t("history.until")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry, i) => (
                    <tr key={i} className={i === 0 ? "bg-green-50 font-medium" : ""}>
                      <td className="px-3 py-2">{entry.price_formatted}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {new Date(entry.valid_from).toLocaleDateString(dateFmt)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {entry.valid_until
                          ? new Date(entry.valid_until).toLocaleDateString(dateFmt)
                          : t("history.current")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
