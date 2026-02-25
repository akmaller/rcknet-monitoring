import { z } from 'zod';

export const changeRequestConfirmSchema = z
  .object({
    confirm: z.boolean()
  })
  .strict();

export const changeRequestParamsSchema = z
  .object({
    id: z.string().uuid()
  })
  .strict();
