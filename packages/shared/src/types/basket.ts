import { z } from "zod";

export const BasketItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const BasketRequestSchema = z.object({
  items: z.array(BasketItemSchema).min(1).max(50),
});

export const StoreTotalSchema = z.object({
  total_cents: z.number().int(),
  total_formatted: z.string(),
  items_available: z.number().int(),
  items_missing: z.number().int(),
  missing_products: z.array(z.string()),
});

export const BasketRecommendationSchema = z.object({
  cheapest_complete_store: z.string().nullable(),
  cheapest_store: z.string(),
  max_savings_cents: z.number().int(),
  max_savings_formatted: z.string(),
  savings_percentage: z.number(),
  note: z.string(),
});

export type BasketItem = z.infer<typeof BasketItemSchema>;
export type BasketRequest = z.infer<typeof BasketRequestSchema>;
export type StoreTotal = z.infer<typeof StoreTotalSchema>;
export type BasketRecommendation = z.infer<typeof BasketRecommendationSchema>;
