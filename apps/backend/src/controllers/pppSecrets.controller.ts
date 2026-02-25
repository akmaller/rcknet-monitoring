import { Request, Response, NextFunction } from 'express';
import { auditLog } from '../services/audit.service';
import { maskSensitive } from '../utils/sanitize';
import { diffObjects } from '../utils/diff';
import { MikrotikClient } from '../services/mikrotik.service';
import {
  executeWrite,
  pppSecretCreate,
  pppSecretUpdate
} from '../services/mikrotikWrite.service';
import prisma from '../db/prisma';

const mikrotik = new MikrotikClient();

const pickSecretFields = (secret: any) => ({
  username: secret?.name || secret?.username || null,
  profile: secret?.profile || null,
  comment: secret?.comment || null,
  disabled: secret?.disabled === 'true' || secret?.disabled === true
});

export const createSecret = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as {
      username: string;
      password: string;
      profile?: string;
      comment?: string;
      disabled?: boolean;
    };

    const dryRunResult = await executeWrite(req.headers, 'ppp.secret.create', payload.username, async () => {
      await pppSecretCreate(payload);
    });

    await auditLog({
      action: 'ppp.secret.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: payload.username,
      status: dryRunResult.dryRun ? 'dry-run' : 'success',
      before: null,
      after: maskSensitive(payload),
      diff: diffObjects(null, maskSensitive(payload))
    });

    res.json({ status: dryRunResult.dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    next(err);
  }
};

export const updateSecret = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const payload = req.body as {
      password?: string;
      profile?: string;
      comment?: string;
      disabled?: boolean;
    };

    const beforeRaw = await mikrotik.getSecretByName(username);
    if (!beforeRaw) {
      return res.status(404).json({ error: 'Not Found' });
    }

    const before = pickSecretFields(beforeRaw);
    const after = { ...before, ...payload, username };

    const dryRunResult = await executeWrite(req.headers, 'ppp.secret.update', username, async () => {
      await pppSecretUpdate(username, payload);
    });

    await auditLog({
      action: 'ppp.secret.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: username,
      status: dryRunResult.dryRun ? 'dry-run' : 'success',
      before: maskSensitive(before),
      after: maskSensitive(after),
      diff: diffObjects(maskSensitive(before), maskSensitive(after))
    });

    res.json({ status: dryRunResult.dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    next(err);
  }
};

export const deleteSecretRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const payload = { username };

    const changeRequest = await prisma.changeRequest.create({
      data: {
        type: 'ppp_secret_delete',
        payload,
        status: 'pending',
        createdById: req.session.user?.id ? BigInt(req.session.user.id) : null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await auditLog({
      action: 'ppp.secret.delete.request',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: username,
      status: 'pending',
      requestId: changeRequest.id,
      meta: { changeRequestId: changeRequest.id }
    });

    res.status(202).json({ status: 'pending', changeRequestId: changeRequest.id });
  } catch (err) {
    next(err);
  }
};
