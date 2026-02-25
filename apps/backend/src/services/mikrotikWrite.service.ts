import env from '../config/env';
import { MikrotikClient } from './mikrotik.service';

export type WriteResult = {
  dryRun: boolean;
  action: string;
  target: string;
  payload: Record<string, unknown>;
};

const client = new MikrotikClient();

const isDryRun = (headers: Record<string, string | string[] | undefined>) => {
  const value = headers['x-dry-run'];
  if (!value) return false;
  const str = Array.isArray(value) ? value[0] : value;
  return str?.toLowerCase() === 'true';
};

export const executeWrite = async (
  headers: Record<string, string | string[] | undefined>,
  action: string,
  target: string,
  handler: () => Promise<void>
): Promise<WriteResult> => {
  const dryRun = isDryRun(headers);
  if (dryRun) {
    return { dryRun: true, action, target, payload: {} };
  }
  await handler();
  return { dryRun: false, action, target, payload: {} };
};

export const pppSecretCreate = async (data: {
  username: string;
  password: string;
  profile?: string;
  comment?: string;
  disabled?: boolean;
}) => {
  const payload: Record<string, any> = {
    name: data.username,
    password: data.password
  };
  if (data.profile) payload.profile = data.profile;
  if (data.comment) payload.comment = data.comment;
  if (data.disabled !== undefined) payload.disabled = data.disabled ? 'yes' : 'no';

  const api = client;
  await api.withClient(async (router) => {
    await router.menu('/ppp secret').add(payload);
  });
};

export const pppSecretUpdate = async (
  username: string,
  data: { password?: string; profile?: string; comment?: string; disabled?: boolean }
) => {
  const payload: Record<string, any> = {};
  if (data.password) payload.password = data.password;
  if (data.profile) payload.profile = data.profile;
  if (data.comment) payload.comment = data.comment;
  if (data.disabled !== undefined) payload.disabled = data.disabled ? 'yes' : 'no';

  const api = client;
  await api.withClient(async (router) => {
    const menu = router.menu('/ppp secret');
    const item = await menu.where('name', username).getOnly();
    if (!item) throw new Error('PPPoE secret not found');
    await menu.where('name', username).update(payload);
  });
};

export const pppSecretDelete = async (username: string) => {
  const api = client;
  await api.withClient(async (router) => {
    const menu = router.menu('/ppp secret');
    const item = await menu.where('name', username).getOnly();
    if (!item) throw new Error('PPPoE secret not found');
    await menu.where('name', username).remove();
  });
};

export const pppProfileCreate = async (data: {
  name: string;
  rateLimit?: string;
  localAddress?: string;
  remoteAddressPool?: string;
}) => {
  const payload: Record<string, any> = {
    name: data.name
  };
  if (data.rateLimit) payload['rate-limit'] = data.rateLimit;
  if (data.localAddress) payload['local-address'] = data.localAddress;
  if (data.remoteAddressPool) payload['remote-address'] = data.remoteAddressPool;

  const api = client;
  await api.withClient(async (router) => {
    await router.menu('/ppp profile').add(payload);
  });
};

export const pppProfileUpdate = async (
  name: string,
  data: { rateLimit?: string; localAddress?: string; remoteAddressPool?: string }
) => {
  const payload: Record<string, any> = {};
  if (data.rateLimit) payload['rate-limit'] = data.rateLimit;
  if (data.localAddress) payload['local-address'] = data.localAddress;
  if (data.remoteAddressPool) payload['remote-address'] = data.remoteAddressPool;

  const api = client;
  await api.withClient(async (router) => {
    const menu = router.menu('/ppp profile');
    const item = await menu.where('name', name).getOnly();
    if (!item) throw new Error('PPPoE profile not found');
    await menu.where('name', name).update(payload);
  });
};

export const pppProfileDelete = async (name: string) => {
  const api = client;
  await api.withClient(async (router) => {
    const menu = router.menu('/ppp profile');
    const item = await menu.where('name', name).getOnly();
    if (!item) throw new Error('PPPoE profile not found');
    await menu.where('name', name).remove();
  });
};

export const shouldDryRun = (headers: Record<string, string | string[] | undefined>) => isDryRun(headers);
