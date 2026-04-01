import { z } from "zod";

export const StorePriceSchema = z.object({
  store_slug: z.string(),
  store_name: z.string(),
  store_color: z.string().nullable(),
  price_cents: z.number().int(),
  price_formatted: z.string(),
  unit_size: z.string(),
  unit_price_cents: z.number().int(),
  unit_price_formatted: z.string(),
  fetched_at: z.string().datetime(),
  is_cheapest: z.boolean(),
});

export const ProductSavingsSchema = z.object({
  amount_cents: z.number().int(),
  percentage: z.number(),
  cheapest_store_slug: z.string(),
  label: z.string(),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.object({
    slug: z.string(),
    name: z.string(),
  }),
  image_url: z.string().nullable(),
  default_unit: z.string(),
  prices: z.array(StorePriceSchema),
  savings: ProductSavingsSchema.nullable(),
});

export type StorePrice = z.infer<typeof StorePriceSchema>;
export type ProductSavings = z.infer<typeof ProductSavingsSchema>;
export type Product = z.infer<typeof ProductSchema>;
