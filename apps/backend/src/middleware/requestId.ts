import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
