import { z } from 'zod';

export const auditQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((value) => (value ? Number(value) : undefined))
      .refine((value) => value === undefined || (Number.isFinite(value) && value > 0 && value <= 200), {
        message: 'limit must be between 1 and 200'
      })
  })
  .strict();
