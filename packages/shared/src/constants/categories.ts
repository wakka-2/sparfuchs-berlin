export const CATEGORIES = [
  { slug: "dairy", name_de: "Milchprodukte", name_en: "Dairy", icon: "\u{1F95B}", sort_order: 1 },
  { slug: "bread", name_de: "Brot & Backwaren", name_en: "Bread & Bakery", icon: "\u{1F35E}", sort_order: 2 },
  { slug: "meat", name_de: "Fleisch & Wurst", name_en: "Meat & Deli", icon: "\u{1F969}", sort_order: 3 },
  { slug: "fruits", name_de: "Obst", name_en: "Fruits", icon: "\u{1F34E}", sort_order: 4 },
  { slug: "vegetables", name_de: "Gem\u00fcse", name_en: "Vegetables", icon: "\u{1F96C}", sort_order: 5 },
  { slug: "beverages", name_de: "Getr\u00e4nke", name_en: "Beverages", icon: "\u{1F964}", sort_order: 6 },
  { slug: "pantry", name_de: "Vorratskammer", name_en: "Pantry", icon: "\u{1FAD9}", sort_order: 7 },
  { slug: "frozen", name_de: "Tiefk\u00fchl", name_en: "Frozen", icon: "\u{1F9CA}", sort_order: 8 },
  { slug: "eggs", name_de: "Eier", name_en: "Eggs", icon: "\u{1F95A}", sort_order: 9 },
  { slug: "household", name_de: "Haushalt", name_en: "Household", icon: "\u{1F9F9}", sort_order: 10 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
