import { Request } from 'express';
import prisma from '../db/prisma';
import logger, { auditLogger } from '../utils/logger';
import { Prisma } from '@prisma/client';

export const auditLog = async (params: {
  action: string;
  userId?: string | null;
  req: Request;
  meta?: Record<string, unknown> | null;
  targetType?: string | null;
  targetId?: string | null;
  status?: string | null;
  requestId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  error?: string | null;
}) => {
  const {
    action,
    userId,
    req,
    meta,
    targetType,
    targetId,
    status,
    requestId,
    before,
    after,
    diff,
    error
  } = params;

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
        targetType: targetType || null,
        targetId: targetId || null,
        status: status || null,
        requestId: requestId || null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
        meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
        before: before ? (before as Prisma.InputJsonValue) : undefined,
        after: after ? (after as Prisma.InputJsonValue) : undefined,
        diff: diff ? (diff as Prisma.InputJsonValue) : undefined,
        error: error || null
      }
    });
  } catch (err) {
    logger.error({ err }, 'audit_log_failed');
  }
};

export const auditLogSystem = async (params: {
  action: string;
  userId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
  targetType?: string | null;
  targetId?: string | null;
  status?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  error?: string | null;
}) => {
  const {
    action,
    userId,
    requestId,
    ip,
    userAgent,
    meta,
    targetType,
    targetId,
    status,
    before,
    after,
    diff,
    error
  } = params;

  auditLogger.debug({
    action,
    userId,
    requestId,
    ip,
    meta
  });

  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: userId ? BigInt(userId) : null,
        targetType: targetType || null,
        targetId: targetId || null,
        status: status || null,
        requestId: requestId || null,
        ip: ip || null,
        userAgent: userAgent || null,
        meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
        before: before ? (before as Prisma.InputJsonValue) : undefined,
        after: after ? (after as Prisma.InputJsonValue) : undefined,
        diff: diff ? (diff as Prisma.InputJsonValue) : undefined,
        error: error || null
      }
    });
  } catch (err) {
    logger.error({ err }, 'audit_log_system_failed');
  }
};
