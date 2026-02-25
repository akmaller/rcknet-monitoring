import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  logger.error({ err }, 'request_error');
  return res.status(500).json({ error: 'Internal Server Error' });
};
