import { z } from "zod";

export const ApiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      timestamp: z.string().datetime(),
      request_id: z.string().optional(),
      pagination: z
        .object({
          page: z.number().int(),
          limit: z.number().int(),
          total_items: z.number().int(),
          total_pages: z.number().int(),
        })
        .optional(),
    }),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  meta: z.object({
    timestamp: z.string().datetime(),
    request_id: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
