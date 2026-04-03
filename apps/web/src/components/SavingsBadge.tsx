import type { ProductSavings } from "../lib/api";

interface SavingsBadgeProps {
  savings: ProductSavings;
}

export function SavingsBadge({ savings }: SavingsBadgeProps) {
  if (savings.amount_cents === 0) return null;

  return (
    <div className="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-800">
      <span className="font-medium">{savings.label}</span>
      <span className="ml-1 text-green-600">({savings.percentage}%)</span>
    </div>
  );
}
