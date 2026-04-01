export const STORES = {
  rewe: {
    name: "REWE",
    slug: "rewe",
    color: "#CC0000",
    website: "https://www.rewe.de",
  },
  lidl: {
    name: "Lidl",
    slug: "lidl",
    color: "#0050AA",
    website: "https://www.lidl.de",
  },
} as const;

export type StoreSlug = keyof typeof STORES;
