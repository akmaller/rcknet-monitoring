import { Request, Response, NextFunction } from 'express';
import env from '../config/env';

export const requestTimeout = (req: Request, res: Response, next: NextFunction) => {
  const timeoutMs = env.requestTimeoutMs;
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timeout' });
    }
  }, timeoutMs);

  const clear = () => clearTimeout(timer);
  res.on('finish', clear);
  res.on('close', clear);

  next();
};
