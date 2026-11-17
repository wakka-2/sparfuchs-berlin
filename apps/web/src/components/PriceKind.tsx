import { useTranslation } from "react-i18next";
import { formatValidUntil } from "../lib/format";
import { Icon } from "./Icon";

/**
 * Says what kind of price this is: a flyer offer ends on a date, an everyday
 * shelf price does not — people should know which one they are looking at.
 */
export function PriceKind({
  price,
  lang,
  className = "",
}: {
  price: { is_offer: boolean; valid_until: string | null };
  lang: string;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!price.is_offer) {
    return (
      <p className={`flex items-center gap-1.5 text-xs text-ink-subtle ${className}`}>
        <Icon name="tag" className="h-3.5 w-3.5" />
        {t("product.regularPrice")}
      </p>
    );
  }
  if (!price.valid_until) return null;
  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium text-deal-700 ${className}`}>
      <Icon name="calendar" className="h-3.5 w-3.5" />
      {t("product.offerUntil", { date: formatValidUntil(price.valid_until, lang) })}
    </p>
  );
}
