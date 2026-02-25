import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const requireRole = (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!roles.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};
