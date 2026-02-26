import prisma from '../db/prisma';
import { MikrotikClient } from './mikrotik.service';
import { pppSecretDelete, pppProfileDelete, pppProfileUpdate } from './mikrotikWrite.service';
import { maskSensitive } from '../utils/sanitize';
import { diffObjects } from '../utils/diff';
import { auditLog } from './audit.service';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { deactivatePackage, removeUserPackage, upsertPackageFromProfile } from './packages.service';

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
            snapshot: (maskSensitive(before) ?? {}) as Prisma.InputJsonValue
          }
        });
      }

      await pppSecretDelete(payload.username);
      await removeUserPackage(payload.username);

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
        diff: diffObjects(maskSensitive(before || {}) ?? null, null)
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
            snapshot: (maskSensitive(before) ?? {}) as Prisma.InputJsonValue
          }
        });
      }

      await pppProfileDelete(payload.name);
      await deactivatePackage(payload.name);

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
        diff: diffObjects(maskSensitive(before || {}) ?? null, null)
      });
    }

    if (changeRequest.type === 'ppp_profile_update_rate_limit') {
      const payload = changeRequest.payload as {
        name: string;
        patch: { rateLimit?: string; localAddress?: string; remoteAddressPool?: string };
      };
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
            snapshot: (maskSensitive(before) ?? {}) as Prisma.InputJsonValue
          }
        });
      }

      await pppProfileUpdate(payload.name, payload.patch);

      const after = {
        ...before,
        rateLimit: payload.patch.rateLimit ?? before?.rateLimit,
        localAddress: payload.patch.localAddress ?? before?.localAddress,
        remoteAddressPool: payload.patch.remoteAddressPool ?? before?.remoteAddressPool
      };

      if (after) {
        await upsertPackageFromProfile({
          name: after.name,
          rateLimit: after.rateLimit ?? null,
          localAddress: after.localAddress ?? null,
          remoteAddressPool: after.remoteAddressPool ?? null
        });
      }

      await auditLog({
        action: 'ppp.profile.update.execute',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_profile',
        targetId: payload.name,
        status: 'success',
        requestId: id,
        before: maskSensitive(before || {}),
        after: maskSensitive(after || {}),
        diff: diffObjects(maskSensitive(before || {}) ?? null, maskSensitive(after || {}) ?? null)
      });
    }

    await prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'applied',
        confirmedById: userId,
        confirmedAt: new Date(),
        executedAt: new Date(),
        error: null
      }
    });

    return { ok: true as const };
  } catch (err: any) {
    await prisma.changeRequest.update({
      where: { id },
      data: { status: 'failed', error: err?.message || 'error' }
    });
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
