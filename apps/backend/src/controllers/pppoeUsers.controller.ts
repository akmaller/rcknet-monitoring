import { Request, Response } from 'express';
import logger from '../utils/logger';
import { auditLog } from '../services/audit.service';
import { MikrotikService } from '../services/pppoeUsers.service';
import { diffObjects } from '../utils/diff';
import { maskSensitive } from '../utils/sanitize';

const service = new MikrotikService();

const pickSecretFields = (secret: any) => ({
  username: secret?.name || secret?.username || null,
  profile: secret?.profile || null,
  comment: secret?.comment || null,
  disabled: secret?.disabled === 'true' || secret?.disabled === true
});

const mapMikrotikError = (err: any) => {
  const message = String(err?.message || '').toLowerCase();
  if (message.includes('not found') || message.includes('no such')) {
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
  };

  try {
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
        after: maskSensitive(payload) ?? null,
        diff: diffObjects(null, maskSensitive(payload) ?? null),
        error: 'Conflict'
      });
      return res.status(409).json({ error: 'Conflict' });
    }

    await service.createSecret(payload);

    await auditLog({
      action: 'pppoe.user.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: payload.username,
      status: 'success',
      before: null,
      after: maskSensitive(payload) ?? null,
      diff: diffObjects(null, maskSensitive(payload) ?? null)
    });

    return res.status(201).json({ status: 'ok' });
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

export const updatePppoeUser = async (req: Request, res: Response) => {
  const name = req.params.name;
  const patch = req.body as {
    password?: string;
    profile?: string;
    comment?: string;
    disabled?: boolean;
  };

  try {
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
    const after = { ...before, ...patch, username: name };

    await service.updateSecret(name, patch);

    await auditLog({
      action: 'pppoe.user.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: 'ok' });
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
    await service.deleteSecret(name);

    await auditLog({
      action: 'pppoe.user.delete',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'success',
      before: maskSensitive(before) ?? null,
      after: null,
      diff: diffObjects(maskSensitive(before) ?? null, null)
    });

    return res.status(204).send();
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

    await service.setSecretDisabled(name, true);

    await auditLog({
      action: 'pppoe.user.disable',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: 'ok' });
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

    await service.setSecretDisabled(name, false);

    await auditLog({
      action: 'pppoe.user.enable',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_secret',
      targetId: name,
      status: 'success',
      before: maskSensitive(before) ?? null,
      after: maskSensitive(after) ?? null,
      diff: diffObjects(maskSensitive(before) ?? null, maskSensitive(after) ?? null)
    });

    return res.json({ status: 'ok' });
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
