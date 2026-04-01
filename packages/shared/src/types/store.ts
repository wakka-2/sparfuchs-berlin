import { z } from "zod";

export const StoreSchema = z.object({
  slug: z.string(),
  name: z.string(),
  logo_url: z.string().nullable(),
  website_url: z.string().nullable(),
  color_hex: z.string().nullable(),
  product_count: z.number().int().optional(),
  last_updated: z.string().datetime().optional(),
});

export type Store = z.infer<typeof StoreSchema>;
