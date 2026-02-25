import { z } from 'zod';

const toInt = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? value : parsed;
};

export const historyQuerySchema = z
  .object({
    limit: z.preprocess(toInt, z.number().int().min(1).max(500).optional()),
    offset: z.preprocess(toInt, z.number().int().min(0).optional())
  })
  .strict();
