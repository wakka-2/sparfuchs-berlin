import type { IconName } from "../components/Icon";

const CATEGORY_ICONS: Record<string, IconName> = {
  dairy: "milk", bread: "bread", meat: "meat", fruits: "apple", vegetables: "carrot",
  beverages: "cup", pantry: "jar", frozen: "snowflake", eggs: "egg", household: "spray", sweets: "sparkles", drugstore: "package",
};

export function categoryIcon(slug: string): IconName {
  return CATEGORY_ICONS[slug] ?? "package";
}
