import { Request } from 'express';
import prisma from '../db/prisma';
import logger, { auditLogger } from '../utils/logger';

export const auditLog = async (params: {
  action: string;
  userId?: string | null;
  req: Request;
  meta?: Record<string, unknown> | null;
}) => {
  const { action, userId, req, meta } = params;

  auditLogger.debug({
    action,
    userId,
    requestId: req.id,
    ip: req.ip,
    meta
  });

  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: userId ? BigInt(userId) : null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
        meta: meta || undefined
      }
    });
  } catch (err) {
    logger.error({ err }, 'audit_log_failed');
  }
};
