import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';
import { auditLog } from '../services/audit.service';

export const getCustomerHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const limit = (req.query.limit as number | undefined) ?? 100;
    const offset = (req.query.offset as number | undefined) ?? 0;

    const data = await prisma.customerStatusEvent.findMany({
      where: { username },
      orderBy: { eventAt: 'desc' },
      take: Math.min(limit, 500),
      skip: Math.max(offset, 0)
    });

    const safeData = data.map((item) => ({
      ...item,
      id: item.id.toString()
    }));

    await auditLog({
      action: 'customers.history',
      userId: req.session.user?.id,
      req,
      meta: { username, limit, offset }
    });

    res.json({ data: safeData });
  } catch (err) {
    next(err);
  }
};
