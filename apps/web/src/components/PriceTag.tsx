import { useTranslation } from "react-i18next";
import type { StorePrice } from "../lib/api";

interface PriceTagProps {
  price: StorePrice;
}

export function PriceTag({ price }: PriceTagProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2"
      style={{ borderColor: price.store_color ?? "#888" }}
    >
      <span
        className="text-xs font-semibold uppercase"
        style={{ color: price.store_color ?? "#888" }}
      >
        {price.store_name}
      </span>
      <span className="text-lg font-bold">{price.price_formatted}</span>
      <span className="text-xs text-gray-500">{price.unit_price_formatted}</span>
      {price.is_cheapest && (
        <span className="mt-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
          {t("product.cheaper")}
        </span>
      )}
    </div>
  );
}
