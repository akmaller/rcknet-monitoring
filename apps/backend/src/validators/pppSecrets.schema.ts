import { z } from 'zod';

export const pppSecretCreateSchema = z
  .object({
    username: z.string().min(1).max(64),
    password: z.string().min(1).max(64),
    profile: z.string().min(1).max(64).optional(),
    comment: z.string().max(200).optional(),
    disabled: z.boolean().optional()
  })
  .strict();

export const pppSecretUpdateSchema = z
  .object({
    password: z.string().min(1).max(64).optional(),
    profile: z.string().min(1).max(64).optional(),
    comment: z.string().max(200).optional(),
    disabled: z.boolean().optional()
  })
  .strict();

export const pppSecretParamsSchema = z
  .object({
    username: z.string().min(1).max(64)
  })
  .strict();
