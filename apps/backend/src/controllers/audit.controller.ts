import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { auditLog } from '../services/audit.service';
import logger from '../utils/logger';

const toStringId = (value: bigint | number | null | undefined) =>
  value === null || value === undefined ? null : value.toString();

export const listAuditLogs = async (req: Request, res: Response) => {
  try {
    const limit = typeof req.query.limit === 'number' ? req.query.limit : Number(req.query.limit || 100);
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100;

    const logs = await prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    const data = logs.map((log) => ({
      id: toStringId(log.id),
      action: log.action,
      status: log.status,
      targetType: log.targetType,
      targetId: log.targetId,
      error: log.error,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: toStringId(log.user.id),
            username: log.user.username,
            role: log.user.role
          }
        : null
    }));

    await auditLog({
      action: 'audit.list',
      userId: req.session.user?.id,
      req,
      targetType: 'audit',
      status: 'success',
      meta: { count: data.length }
    });

    return res.json({ data });
  } catch (err) {
    logger.error({ err }, 'audit_list_failed');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
