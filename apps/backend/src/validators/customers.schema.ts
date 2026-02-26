import { z } from 'zod';
import { ConnectionStatus } from '@prisma/client';

const toInt = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? value : parsed;
};

const baseFilters = {
  status: z.nativeEnum(ConnectionStatus).optional(),
  search: z.string().min(1).max(100).optional(),
  profile: z.string().min(1).max(100).optional(),
  comment: z.string().min(1).max(200).optional()
};

export const customersQuerySchema = z
  .object({
    limit: z.preprocess(toInt, z.number().int().min(1).max(1000).optional()),
    offset: z.preprocess(toInt, z.number().int().min(0).optional()),
    ...baseFilters
  })
  .strict();

export const customersStatsQuerySchema = z
  .object({
    ...baseFilters
  })
  .strict();

export const customerParamsSchema = z
  .object({
    username: z.string().min(1).max(100)
  })
  .strict();
