import { z } from 'zod';
import { isValidRateLimit } from '../utils/rateLimit';

export const pppProfileCreateSchema = z
  .object({
    name: z.string().min(1).max(64),
    rateLimit: z.string().min(3).max(64).refine(isValidRateLimit, {
      message: 'Format rate-limit harus <download><unit>/<upload><unit> (contoh 100M/10M)'
    }).optional(),
    localAddress: z.string().min(1).max(64).optional(),
    remoteAddressPool: z.string().min(1).max(64).optional()
  })
  .strict();

export const pppProfileUpdateSchema = z
  .object({
    rateLimit: z.string().min(3).max(64).refine(isValidRateLimit, {
      message: 'Format rate-limit harus <download><unit>/<upload><unit> (contoh 100M/10M)'
    }).optional(),
    localAddress: z.string().min(1).max(64).optional(),
    remoteAddressPool: z.string().min(1).max(64).optional()
  })
  .strict();

export const pppProfileParamsSchema = z
  .object({
    name: z.string().min(1).max(64)
  })
  .strict();
