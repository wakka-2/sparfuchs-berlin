import { useTranslation } from "react-i18next";
import { useBasketStore } from "../stores/basket";
import { Icon } from "./Icon";

interface AddToListButtonProps {
  productId: string;
  productName: string;
  /** "icon": round 44px button for cards; "full": labelled button */
  variant?: "icon" | "full";
}

export function AddToListButton({ productId, productName, variant = "full" }: AddToListButtonProps) {
  const { t } = useTranslation();
  const rawItems = useBasketStore((s) => s.items);
  const items = Array.isArray(rawItems) ? rawItems : [];
  const addItem = useBasketStore((s) => s.addItem);
  const removeItem = useBasketStore((s) => s.removeItem);
  const inList = items.some((i) => i.productId === productId);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inList) removeItem(productId);
    else addItem(productId, productName);
  };

  const label = inList
    ? t("product.removeFromList", { name: productName })
    : t("product.addNamedToList", { name: productName });

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={inList}
        aria-label={label}
        title={label}
        className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-sm ring-1 transition duration-200 active:scale-95 ${
          inList
            ? "bg-brand-600 text-white ring-brand-600 hover:bg-brand-700"
            : "bg-white text-brand-700 ring-line hover:bg-brand-50 hover:ring-brand-200"
        }`}
      >
        <Icon name={inList ? "check" : "plus"} className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={inList}
      className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition duration-200 active:scale-[0.98] ${
        inList
          ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
          : "bg-brand-700 text-white hover:bg-brand-800"
      }`}
    >
      <Icon name={inList ? "check" : "plus"} className="h-5 w-5" />
      {inList ? t("product.onList") : t("product.addToList")}
    </button>
  );
}
