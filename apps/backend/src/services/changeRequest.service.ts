import prisma from '../db/prisma';
import { MikrotikClient } from './mikrotik.service';
import { pppSecretDelete, pppProfileDelete } from './mikrotikWrite.service';
import { maskSensitive } from '../utils/sanitize';
import { diffObjects } from '../utils/diff';
import { auditLog } from './audit.service';
import { Request } from 'express';

const mikrotik = new MikrotikClient();

const isExpired = (expiresAt: Date | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

export const confirmChangeRequest = async (req: Request, id: string) => {
  const changeRequest = await prisma.changeRequest.findUnique({ where: { id } });
  if (!changeRequest) {
    return { ok: false as const, status: 404, message: 'Not Found' };
  }

  if (changeRequest.status !== 'pending') {
    return { ok: false as const, status: 409, message: 'Not pending' };
  }

  if (isExpired(changeRequest.expiresAt)) {
    await prisma.changeRequest.update({ where: { id }, data: { status: 'expired' } });
    return { ok: false as const, status: 410, message: 'Expired' };
  }

  const userId = req.session.user?.id ? BigInt(req.session.user.id) : null;

  try {
    if (changeRequest.type === 'ppp_secret_delete') {
      const payload = changeRequest.payload as { username: string };
      const beforeRaw = await mikrotik.getSecretByName(payload.username);
      const before = beforeRaw ? { username: beforeRaw.name, profile: beforeRaw.profile, comment: beforeRaw.comment } : null;

      if (before) {
        await prisma.rollbackSnapshot.create({
          data: {
            changeRequestId: id,
            snapshot: maskSensitive(before)
          }
        });
      }

      await pppSecretDelete(payload.username);

      await auditLog({
        action: 'ppp.secret.delete.execute',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: payload.username,
        status: 'success',
        requestId: id,
        before: maskSensitive(before || {}),
        after: null,
        diff: diffObjects(maskSensitive(before || {}), null)
      });
    }

    if (changeRequest.type === 'ppp_profile_delete') {
      const payload = changeRequest.payload as { name: string };
      const beforeRaw = await mikrotik.getProfileByName(payload.name);
      const before = beforeRaw
        ? {
            name: beforeRaw.name,
            rateLimit: beforeRaw['rate-limit'],
            localAddress: beforeRaw['local-address'],
            remoteAddressPool: beforeRaw['remote-address']
          }
        : null;

      if (before) {
        await prisma.rollbackSnapshot.create({
          data: {
            changeRequestId: id,
            snapshot: maskSensitive(before)
          }
        });
      }

      await pppProfileDelete(payload.name);

      await auditLog({
        action: 'ppp.profile.delete.execute',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_profile',
        targetId: payload.name,
        status: 'success',
        requestId: id,
        before: maskSensitive(before || {}),
        after: null,
        diff: diffObjects(maskSensitive(before || {}), null)
      });
    }

    await prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'executed',
        confirmedById: userId,
        confirmedAt: new Date(),
        executedAt: new Date()
      }
    });

    return { ok: true as const };
  } catch (err: any) {
    await prisma.changeRequest.update({ where: { id }, data: { status: 'failed' } });
    await auditLog({
      action: 'change_request.failed',
      userId: req.session.user?.id,
      req,
      targetType: 'change_request',
      targetId: id,
      status: 'failed',
      requestId: id,
      error: err?.message || 'error'
    });
    return { ok: false as const, status: 500, message: 'Execution failed' };
  }
};
