import { Request } from 'express';
import { shouldDryRun } from '../services/mikrotikWrite.service';

export const isDryRunRequest = (req: Request) => {
  const queryValue = String(req.query?.dryRun || '').toLowerCase();
  if (queryValue === 'true') return true;
  return shouldDryRun(req.headers as Record<string, string | string[] | undefined>);
};
