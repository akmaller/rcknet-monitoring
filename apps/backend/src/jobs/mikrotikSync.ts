import cron from 'node-cron';
import { Pool } from 'pg';
import env from '../config/env';
import logger from '../utils/logger';
import prisma from '../db/prisma';
import { MikrotikClient } from '../services/mikrotik.service';
import { ConnectionStatus } from '@prisma/client';

const client = new MikrotikClient();
type LockRow = { locked: boolean };
const lockPool = new Pool({ connectionString: env.databaseUrl, max: 1 });

const withAdvisoryLock = async (fn: () => Promise<void>) => {
  const client = await lockPool.connect();
  try {
    const result = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [env.syncLockId]);
    const rows = result.rows as LockRow[];
    if (!rows[0]?.locked) {
      logger.warn('mikrotik_sync_skipped_lock');
      return;
    }
    try {
      await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [env.syncLockId]);
    }
  } finally {
    client.release();
  }
};

type ActiveItem = {
  username: string;
  activeIp: string | null;
  uptime: string | null;
};

type SecretItem = {
  username: string;
  profile: string | null;
  comment: string | null;
};

const normalizeActive = (item: Record<string, unknown>): ActiveItem | null => {
  const username = (item.name || item.user || item['name']) as string | undefined;
  if (!username) return null;
  return {
    username,
    activeIp: (item.address || item['address']) ? String(item.address || item['address']) : null,
    uptime: item.uptime ? String(item.uptime) : null
  };
};

const normalizeSecret = (item: Record<string, unknown>): SecretItem | null => {
  const username = (item.name || item['name']) as string | undefined;
  if (!username) return null;
  return {
    username,
    profile: item.profile ? String(item.profile) : null,
    comment: item.comment ? String(item.comment) : null
  };
};

const buildSecretMap = (secrets: Record<string, unknown>[]) => {
  const map = new Map<string, { profile: string | null; comment: string | null }>();
  secrets.forEach((item) => {
    const secret = normalizeSecret(item);
    if (secret && secret.username) {
      map.set(secret.username, { profile: secret.profile, comment: secret.comment });
    }
  });
  return map;
};

export const syncMikrotik = async () => {
  const now = new Date();
  await prisma.syncState.upsert({
    where: { id: 'mikrotik' },
    update: { lastRunAt: now, lastError: null },
    create: { id: 'mikrotik', lastRunAt: now, lastError: null }
  });

  const activeRaw = await client.getActiveSessions();
  const activeList: ActiveItem[] = (activeRaw || [])
    .map(normalizeActive)
    .filter((item: ActiveItem | null): item is ActiveItem => Boolean(item));

  const activeMap = new Map(activeList.map((item) => [item.username, item]));
  const activeUsernamesArray = Array.from(new Set(activeList.map((item) => item.username)));

  const secretsRaw = env.mikrotik.fetchSecrets ? await client.getSecrets() : [];
  const secretMap = buildSecretMap(secretsRaw);

  const seenAt = new Date();

  const previousActives = activeUsernamesArray.length
    ? await prisma.customerStatus.findMany({
        where: { username: { in: activeUsernamesArray } },
        select: { username: true, status: true, profile: true, comment: true }
      })
    : [];

  const toOffline = await prisma.customerStatus.findMany({
    where: activeUsernamesArray.length
      ? { status: ConnectionStatus.online, username: { notIn: activeUsernamesArray } }
      : { status: ConnectionStatus.online },
    select: { username: true, profile: true, comment: true }
  });

  const previousMap = new Map(previousActives.map((item) => [item.username, item]));
  const newlyOnline = activeUsernamesArray.filter((username) => {
    const previous = previousMap.get(username);
    return !previous || previous.status !== ConnectionStatus.online;
  });

  await prisma.$transaction(async (tx) => {
    if (env.mikrotik.fetchSecrets) {
      for (const [username, secret] of secretMap.entries()) {
        const active = activeMap.get(username);
        const isActive = Boolean(active);
        await tx.customerStatus.upsert({
          where: { username },
          update: {
            status: isActive ? ConnectionStatus.online : ConnectionStatus.offline,
            activeIp: isActive ? active?.activeIp || null : null,
            uptime: isActive ? active?.uptime || null : null,
            profile: secret.profile || null,
            comment: secret.comment || null,
            ...(isActive ? { lastSeen: seenAt } : {})
          },
          create: {
            username,
            status: isActive ? ConnectionStatus.online : ConnectionStatus.offline,
            activeIp: isActive ? active?.activeIp || null : null,
            uptime: isActive ? active?.uptime || null : null,
            profile: secret.profile || null,
            comment: secret.comment || null,
            lastSeen: isActive ? seenAt : null
          }
        });
      }
    }

    for (const item of activeList) {
      if (secretMap.has(item.username)) continue;
      await tx.customerStatus.upsert({
        where: { username: item.username },
        update: {
          status: ConnectionStatus.online,
          activeIp: item.activeIp,
          uptime: item.uptime,
          profile: null,
          comment: null,
          lastSeen: seenAt
        },
        create: {
          username: item.username,
          status: ConnectionStatus.online,
          activeIp: item.activeIp,
          uptime: item.uptime,
          profile: null,
          comment: null,
          lastSeen: seenAt
        }
      });
    }

    const activeListArray = activeUsernamesArray;
    if (activeListArray.length > 0) {
      await tx.customerStatus.updateMany({
        where: { username: { notIn: activeListArray } },
        data: { status: ConnectionStatus.offline, activeIp: null, uptime: null }
      });
    } else {
      await tx.customerStatus.updateMany({
        data: { status: ConnectionStatus.offline, activeIp: null, uptime: null }
      });
    }

    if (env.historyEnabled) {
      const events: Array<{
        username: string;
        status: ConnectionStatus;
        activeIp?: string | null;
        profile?: string | null;
        comment?: string | null;
        eventAt: Date;
      }> = [];

      for (const username of newlyOnline) {
        const active = activeMap.get(username);
        const secret = secretMap.get(username);
        const previous = previousMap.get(username);
        events.push({
          username,
          status: ConnectionStatus.online,
          activeIp: active?.activeIp || null,
          profile: secret?.profile || previous?.profile || null,
          comment: secret?.comment || previous?.comment || null,
          eventAt: seenAt
        });
      }

      for (const item of toOffline) {
        const secret = secretMap.get(item.username);
        events.push({
          username: item.username,
          status: ConnectionStatus.offline,
          activeIp: null,
          profile: secret?.profile || item.profile || null,
          comment: secret?.comment || item.comment || null,
          eventAt: seenAt
        });
      }

      if (events.length > 0) {
        await tx.customerStatusEvent.createMany({ data: events });
      }
    }
  });

  await prisma.syncState.upsert({
    where: { id: 'mikrotik' },
    update: { lastSuccessAt: new Date(), lastError: null },
    create: { id: 'mikrotik', lastSuccessAt: new Date(), lastError: null }
  });
};

export const startMikrotikSync = () => {
  let running = false;
  cron.schedule(env.syncCron, async () => {
    if (running) return;
    running = true;
    try {
      await withAdvisoryLock(syncMikrotik);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await prisma.syncState.upsert({
        where: { id: 'mikrotik' },
        update: { lastError: message },
        create: { id: 'mikrotik', lastError: message }
      });
      logger.error({ err }, 'mikrotik_sync_failed');
    } finally {
      running = false;
    }
  });
};
