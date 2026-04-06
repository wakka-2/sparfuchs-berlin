import { useTranslation } from "react-i18next";
import { useBasketStore } from "../stores/basket";

interface AddToListButtonProps {
  productId: string;
  productName: string;
  compact?: boolean;
}

export function AddToListButton({ productId, productName, compact }: AddToListButtonProps) {
  const { t } = useTranslation();
  const items = useBasketStore((s) => s.items);
  const addItem = useBasketStore((s) => s.addItem);
  const removeItem = useBasketStore((s) => s.removeItem);

  const inList = items.some((i) => i.productId === productId);

  if (inList) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          removeItem(productId);
        }}
        className={`rounded-lg border border-green-600 bg-green-50 font-medium text-green-700 hover:bg-green-100 ${
          compact ? "px-3 py-1.5 text-xs" : "w-full px-4 py-2 text-sm"
        }`}
        aria-label={`${productName} remove`}
      >
        {t("product.onList")}
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(productId, productName);
      }}
      className={`rounded-lg bg-green-700 font-medium text-white hover:bg-green-800 ${
        compact ? "px-3 py-1.5 text-xs" : "w-full px-4 py-2 text-sm"
      }`}
      aria-label={`${productName} add`}
    >
      {t("product.addToList")}
    </button>
  );
}
