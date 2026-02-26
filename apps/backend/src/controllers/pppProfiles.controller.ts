import { Request, Response, NextFunction } from 'express';
import { auditLog } from '../services/audit.service';
import { maskSensitive } from '../utils/sanitize';
import { diffObjects } from '../utils/diff';
import { MikrotikClient } from '../services/mikrotik.service';
import {
  executeWrite,
  pppProfileCreate,
  pppProfileUpdate
} from '../services/mikrotikWrite.service';
import prisma from '../db/prisma';
import { Prisma } from '@prisma/client';
import { upsertPackageFromProfile } from '../services/packages.service';

const mikrotik = new MikrotikClient();

const pickProfileFields = (profile: any) => ({
  name: profile?.name || null,
  rateLimit: profile?.['rate-limit'] || profile?.rateLimit || null,
  localAddress: profile?.['local-address'] || profile?.localAddress || null,
  remoteAddressPool: profile?.['remote-address'] || profile?.remoteAddress || null
});

export const createProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as {
      name: string;
      rateLimit?: string;
      localAddress?: string;
      remoteAddressPool?: string;
    };

    const dryRunResult = await executeWrite(req.headers, 'ppp.profile.create', payload.name, async () => {
      await pppProfileCreate(payload);
    });

    if (!dryRunResult.dryRun) {
      await upsertPackageFromProfile({
        name: payload.name,
        rateLimit: payload.rateLimit ?? null,
        localAddress: payload.localAddress ?? null,
        remoteAddressPool: payload.remoteAddressPool ?? null
      });
    }

    await auditLog({
      action: 'ppp.profile.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: payload.name,
      status: dryRunResult.dryRun ? 'dry-run' : 'success',
      before: null,
      after: maskSensitive(payload) ?? null,
      diff: diffObjects(null, maskSensitive(payload) ?? null)
    });

    res.json({ status: dryRunResult.dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.params.name;
    const payload = req.body as {
      rateLimit?: string;
      localAddress?: string;
      remoteAddressPool?: string;
    };

    const beforeRaw = await mikrotik.getProfileByName(name);
    if (!beforeRaw) {
      return res.status(404).json({ error: 'Not Found' });
    }

    const before = pickProfileFields(beforeRaw);
    const after = { ...before, ...payload, name };

    const dryRunResult = await executeWrite(req.headers, 'ppp.profile.update', name, async () => {
      await pppProfileUpdate(name, payload);
    });

    if (!dryRunResult.dryRun) {
      await upsertPackageFromProfile({
        name,
        rateLimit: payload.rateLimit ?? before.rateLimit ?? null,
        localAddress: payload.localAddress ?? before.localAddress ?? null,
        remoteAddressPool: payload.remoteAddressPool ?? before.remoteAddressPool ?? null
      });
    }

    await auditLog({
      action: 'ppp.profile.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: name,
      status: dryRunResult.dryRun ? 'dry-run' : 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    res.json({ status: dryRunResult.dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    next(err);
  }
};

export const deleteProfileRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.params.name;
    const payload = { name };

    const changeRequest = await prisma.changeRequest.create({
      data: {
        type: 'ppp_profile_delete',
        payload,
        status: 'pending',
        createdById: req.session.user?.id ? BigInt(req.session.user.id) : null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await auditLog({
      action: 'ppp.profile.delete.request',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: name,
      status: 'pending',
      requestId: changeRequest.id,
      meta: { changeRequestId: changeRequest.id }
    });

    res.status(202).json({ status: 'pending', changeRequestId: changeRequest.id });
  } catch (err) {
    next(err);
  }
};
