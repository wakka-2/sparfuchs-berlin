import { z } from "zod";

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  product_count: z.number().int(),
  sort_order: z.number().int(),
});

export type Category = z.infer<typeof CategorySchema>;
