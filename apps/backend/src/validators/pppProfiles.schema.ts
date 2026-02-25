import { z } from 'zod';

export const pppProfileCreateSchema = z
  .object({
    name: z.string().min(1).max(64),
    rateLimit: z.string().min(1).max(64).optional(),
    localAddress: z.string().min(1).max(64).optional(),
    remoteAddressPool: z.string().min(1).max(64).optional()
  })
  .strict();

export const pppProfileUpdateSchema = z
  .object({
    rateLimit: z.string().min(1).max(64).optional(),
    localAddress: z.string().min(1).max(64).optional(),
    remoteAddressPool: z.string().min(1).max(64).optional()
  })
  .strict();

export const pppProfileParamsSchema = z
  .object({
    name: z.string().min(1).max(64)
  })
  .strict();
