import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';
import { auditLog } from '../services/audit.service';
import { MikrotikClient } from '../services/mikrotik.service';

const mikrotikClient = new MikrotikClient();

export const getMikrotikSyncStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await prisma.syncState.findUnique({ where: { id: 'mikrotik' } });

    await auditLog({
      action: 'sync.mikrotik.status',
      userId: req.session.user?.id,
      req
    });

    res.json({ data: status });
  } catch (err) {
    next(err);
  }
};

export const getMikrotikSystemInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await mikrotikClient.getSystemResourceInfo();

    await auditLog({
      action: 'sync.mikrotik.info',
      userId: req.session.user?.id,
      req
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};
