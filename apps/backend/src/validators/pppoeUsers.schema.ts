import { z } from 'zod';
import env from '../config/env';

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh alnum + . _ -');

const passwordSchema = env.nodeEnv === 'production'
  ? z.string().min(8).max(64)
  : z.string().min(4).max(64);

export const pppoeUserCreateSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    profile: z.string().min(1).max(64).optional(),
    comment: z.string().max(200).optional(),
    disabled: z.boolean().optional()
  })
  .strict();

export const pppoeUserPatchSchema = z
  .object({
    password: passwordSchema.optional(),
    profile: z.string().min(1).max(64).optional(),
    comment: z.string().max(200).optional(),
    disabled: z.boolean().optional()
  })
  .strict();

export const pppoeUserParamsSchema = z
  .object({
    name: usernameSchema
  })
  .strict();
