import { z } from 'zod';
import { isValidRateLimit } from '../utils/rateLimit';

const nameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Name hanya boleh alnum + . _ -');

const rateLimitSchema = z.string().min(3).max(64).refine(isValidRateLimit, {
  message: 'Format rate-limit harus <download><unit>/<upload><unit> (contoh 100M/10M)'
});

const addressSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[0-9A-Za-z._:/-]+$/, 'Format address/pool tidak valid');

export const pppoeProfileCreateSchema = z
  .object({
    name: nameSchema,
    rateLimit: rateLimitSchema.optional(),
    localAddress: addressSchema.optional(),
    remoteAddressPool: addressSchema.optional()
  })
  .strict();

export const pppoeProfilePatchSchema = z
  .object({
    rateLimit: rateLimitSchema.optional(),
    localAddress: addressSchema.optional(),
    remoteAddressPool: addressSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diubah'
  });

export const pppoeProfileParamsSchema = z
  .object({
    name: nameSchema
  })
  .strict();

export const pppoeProfileQuerySchema = z
  .object({
    dryRun: z.enum(['true', 'false']).optional()
  })
  .strict();
