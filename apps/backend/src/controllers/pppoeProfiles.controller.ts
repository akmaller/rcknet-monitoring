import { Request, Response } from 'express';
import logger from '../utils/logger';
import { auditLog } from '../services/audit.service';
import { diffObjects } from '../utils/diff';
import { PppoeProfilesService } from '../services/pppoeProfiles.service';

const service = new PppoeProfilesService();

const pickProfileFields = (profile: any) => ({
  name: profile?.name || null,
  rateLimit: profile?.['rate-limit'] || profile?.rateLimit || null,
  localAddress: profile?.['local-address'] || profile?.localAddress || null,
  remoteAddressPool: profile?.['remote-address'] || profile?.remoteAddress || null
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

const isDryRun = (req: Request) => String(req.query?.dryRun || '').toLowerCase() === 'true';

const buildCommand = (base: string, args: Record<string, string | undefined>) => {
  const parts = Object.entries(args)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${value}"`);
  return [base, ...parts].join(' ');
};

export const listProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await service.listProfiles();
    const items = (profiles || []).map(pickProfileFields);

    await auditLog({
      action: 'pppoe.profile.list',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      status: 'success',
      meta: { count: items.length }
    });

    return res.json({ data: items });
  } catch (err) {
    logger.error({ err }, 'pppoe_profile_list_failed');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createProfile = async (req: Request, res: Response) => {
  const payload = req.body as {
    name: string;
    rateLimit?: string;
    localAddress?: string;
    remoteAddressPool?: string;
  };

  try {
    const dryRun = isDryRun(req);
    const existing = await service.getProfileByName(payload.name);
    if (existing) {
      await auditLog({
        action: 'pppoe.profile.create',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_profile',
        targetId: payload.name,
        status: 'failed',
        error: 'Conflict'
      });
      return res.status(409).json({ error: 'Conflict' });
    }

    if (!dryRun) {
      await service.createProfile(payload);
    }

    const command = buildCommand('/ppp profile add', {
      name: payload.name,
      'rate-limit': payload.rateLimit,
      'local-address': payload.localAddress,
      'remote-address': payload.remoteAddressPool
    });

    await auditLog({
      action: 'pppoe.profile.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: payload.name,
      status: dryRun ? 'dry-run' : 'success',
      before: null,
      after: payload,
      diff: diffObjects(null, payload)
    });

    return res.status(201).json({ status: dryRun ? 'dry-run' : 'ok', commands: dryRun ? [command] : undefined });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.profile.create',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: payload.name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_profile_create_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const name = req.params.name;
  const patch = req.body as {
    rateLimit?: string;
    localAddress?: string;
    remoteAddressPool?: string;
  };

  try {
    const dryRun = isDryRun(req);
    const beforeRaw = await service.getProfileByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.profile.update',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_profile',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickProfileFields(beforeRaw);
    const after = { ...before, ...patch, name };

    if (!dryRun) {
      await service.updateProfile(name, patch);
    }

    const command = buildCommand('/ppp profile set [find name="' + name + '"]', {
      'rate-limit': patch.rateLimit,
      'local-address': patch.localAddress,
      'remote-address': patch.remoteAddressPool
    });

    await auditLog({
      action: 'pppoe.profile.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: name,
      status: dryRun ? 'dry-run' : 'success',
      before: before,
      after: after,
      diff: diffObjects(before, after)
    });

    return res.json({ status: dryRun ? 'dry-run' : 'ok', commands: dryRun ? [command] : undefined });
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.profile.update',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_profile_update_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  const name = req.params.name;

  try {
    const dryRun = isDryRun(req);
    const beforeRaw = await service.getProfileByName(name);
    if (!beforeRaw) {
      await auditLog({
        action: 'pppoe.profile.delete',
        userId: req.session.user?.id,
        req,
        targetType: 'ppp_profile',
        targetId: name,
        status: 'failed',
        error: 'Not Found'
      });
      return res.status(409).json({ error: 'Not Found' });
    }

    const before = pickProfileFields(beforeRaw);
    if (!dryRun) {
      await service.deleteProfile(name);
    }

    const command = `/ppp profile remove [find name="${name}"]`;

    await auditLog({
      action: 'pppoe.profile.delete',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: name,
      status: dryRun ? 'dry-run' : 'success',
      before: before,
      after: null,
      diff: diffObjects(before, null)
    });

    if (dryRun) {
      return res.json({ status: 'dry-run', commands: [command] });
    }
    return res.status(204).send();
  } catch (err) {
    const mapped = mapMikrotikError(err);
    await auditLog({
      action: 'pppoe.profile.delete',
      userId: req.session.user?.id,
      req,
      targetType: 'ppp_profile',
      targetId: name,
      status: 'failed',
      error: mapped.error
    });
    logger.error({ err }, 'pppoe_profile_delete_failed');
    return res.status(mapped.status).json({ error: mapped.error });
  }
};
