import { Request, Response } from 'express';
import logger from '../utils/logger';
import { auditLog } from '../services/audit.service';
import { MikrotikService } from '../services/pppoeUsers.service';
import { diffObjects } from '../utils/diff';
import { maskSensitive } from '../utils/sanitize';
import prisma from '../db/prisma';
import { Prisma } from '@prisma/client';
import { isDryRunRequest } from '../utils/dryRun';
import { normalizeRateLimit } from '../utils/rateLimit';
import { upsertUserPackage } from '../services/packages.service';

const service = new MikrotikService();

const pickSecretFields = (secret: any) => {
  const rawRateLimit = secret?.['rate-limit'] ?? secret?.rateLimit;
  const rateLimit = rawRateLimit ? String(rawRateLimit).trim() : null;
  return {
    username: secret?.name || secret?.username || null,
    profile: secret?.profile || null,
    comment: secret?.comment || null,
    rateLimit: rateLimit || null,
    disabled: secret?.disabled === 'true' || secret?.disabled === true
  };
};

const mapMikrotikError = (err: any) => {
  const message = String(err?.message || '').toLowerCase();
  if (message.includes('not found') || message.includes('no such') || message.includes('not_found')) {
    return { status: 409, error: 'Not Found' };
  }
  if (message.includes('already') || message.includes('exists')) {
    return { status: 409, error: 'Conflict' };
  }
  return { status: 500, error: 'Internal Server Error' };
};

export const createPppoeUser = async (req: Request, res: Response) => {
  const payload = req.body as {
    username: string;
    password: string;
    profile?: string;
    comment?: string;
    disabled?: boolean;
    rateLimit?: string;
  };

  try {
    const dryRun = isDryRunRequest(req);
    const normalized = { ...payload } as typeof payload;
    if (payload.rateLimit !== undefined) {
      normalized.rateLimit = normalizeRateLimit(payload.rateLimit);
    }
    const existing = await service.getSecretByName(payload.username);
    if (existing) {
      await auditLog({
        action: 'pppoe.user.create',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: payload.username,
        status: 'failed',
        before: null,
        after: maskSensitive(normalized) ?? null,
        diff: diffObjects(null, maskSensitive(normalized) ?? null),
        error: 'Conflict'
      });
      return res.status(409).json({ error: 'Conflict' });
    }

    if (!dryRun) {
      await service.createSecret(normalized);
      await upsertUserPackage(payload.username, normalized.profile ?? null);
    }

    const auditAfter = normalized.rateLimit === '' ? { ...normalized, rateLimit: null } : normalized;

    await auditLog({
      action: 'pppoe.user.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: payload.username,
      status: dryRun ? 'dry-run' : 'success',
      before: null,
      after: maskSensitive(auditAfter) ?? null,
      diff: diffObjects(null, maskSensitive(auditAfter) ?? null)
    });

    return res.status(201).json({ status: dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.user.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: payload.username,
      status: 'failed',
      before: null,
      after: maskSensitive(payload) ?? null,
      diff: diffObjects(null, maskSensitive(payload) ?? null),
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_user_create_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const listPppoeUsers = async (req: Request, res: Response) => {
  try {
    const secrets = await service.listSecrets();
    const items = (secrets || []).map(pickSecretFields);

    await auditLog({
      action: 'pppoe.user.list',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      status: 'success',
      meta: { count: items.length }
    });

    return res.json({ data: items });
  } catch (err) {
    logger.error({ err }, 'pppoe_user_list_failed');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updatePppoeUser = async (req: Request, res: Response) => {
  const name = req.params.name;
  const patch = req.body as {
    password?: string;
    profile?: string;
    comment?: string;
    disabled?: boolean;
    rateLimit?: string;
  };

  try {
    const dryRun = isDryRunRequest(req);
    const beforeRaw = await service.getSecretByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.user.update',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickSecretFields(beforeRaw);
    const normalizedPatch = { ...patch } as typeof patch;
    if (patch.rateLimit !== undefined) {
      normalizedPatch.rateLimit = normalizeRateLimit(patch.rateLimit);
    }
    const after = { ...before, ...normalizedPatch, username: name };
    if (normalizedPatch.rateLimit === '') {
      after.rateLimit = null;
    }

    if (!dryRun) {
      await service.updateSecret(name, normalizedPatch);
      if (normalizedPatch.profile !== undefined) {
        await upsertUserPackage(name, normalizedPatch.profile ?? null);
      }
    }

    await auditLog({
      action: 'pppoe.user.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: dryRun ? 'dry-run' : 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.user.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_user_update_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const deletePppoeUser = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    const beforeRaw = await service.getSecretByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.user.delete',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickSecretFields(beforeRaw);

    const changeRequest = await prisma.changeRequest.create({
      data: {
        type: 'ppp_secret_delete',
        payload: {
          username: name,
          before: maskSensitive(before) ?? null,
          after: null,
          diff: diffObjects(maskSensitive(before) ?? null, null)
        } as Prisma.InputJsonValue,
        status: 'pending',
        createdById: req.session.user?.id ? BigInt(req.session.user.id) : null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    await auditLog({
      action: 'pppoe.user.delete.request',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'pending',
      requestId: changeRequest.id,
      before: maskSensitive(before) ?? null,
      after: null,
      diff: diffObjects(maskSensitive(before) ?? null, null)
    });

    return res.status(202).json({
      status: 'pending',
      changeRequestId: changeRequest.id,
      diff: diffObjects(maskSensitive(before) ?? null, null),
      before: maskSensitive(before) ?? null,
      after: null
    });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.user.delete',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_user_delete_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const disablePppoeUser = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    const dryRun = isDryRunRequest(req);
    const beforeRaw = await service.getSecretByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.user.disable',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickSecretFields(beforeRaw);
    const after = { ...before, disabled: true, username: name };

    if (!dryRun) {
      await service.setSecretDisabled(name, true);
    }

    await auditLog({
      action: 'pppoe.user.disable',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: dryRun ? 'dry-run' : 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.user.disable',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_user_disable_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const enablePppoeUser = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    const dryRun = isDryRunRequest(req);
    const beforeRaw = await service.getSecretByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.user.enable',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickSecretFields(beforeRaw);
    const after = { ...before, disabled: false, username: name };

    if (!dryRun) {
      await service.setSecretDisabled(name, false);
    }

    await auditLog({
      action: 'pppoe.user.enable',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: dryRun ? 'dry-run' : 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.user.enable',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_user_enable_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const resetPppoeUserRateLimit = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    const dryRun = isDryRunRequest(req);
    const beforeRaw = await service.getSecretByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.user.rate_limit.reset',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_secret',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickSecretFields(beforeRaw);
    const after = { ...before, rateLimit: null, username: name };

    if (!dryRun) {
      await service.updateSecret(name, { rateLimit: '' });
    }

    await auditLog({
      action: 'pppoe.user.rate_limit.reset',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: dryRun ? 'dry-run' : 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: dryRun ? 'dry-run' : 'ok' });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.user.rate_limit.reset',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_user_rate_limit_reset_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};
