import { Pool } from 'pg';
import env from '../config/env';
import logger from '../utils/logger';
import { MikrotikClient } from '../services/mikrotik.service';
import { auditLogSystem } from '../services/audit.service';
import { claimNextJob, logQueueError, markJobFailed, markJobSuccess } from '../services/queue.service';

const workerPool = new Pool({ connectionString: env.databaseUrl, max: 1 });
const mikrotik = new MikrotikClient();

type LockRow = { locked: boolean };

const withQueueLock = async (fn: () => Promise<void>) => {
  const client = await workerPool.connect();
  try {
    const result = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [env.queue.lockId]);
    const rows = result.rows as LockRow[];
    if (!rows[0]?.locked) return;
    try {
      await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [env.queue.lockId]);
    }
  } finally {
    client.release();
  }
};

const executeBulkResetRateLimit = async (payload: { profileName: string }) => {
  const profileName = payload.profileName;
  const updated: string[] = [];
  await mikrotik.withClient(async (router) => {
    const menu = router.menu('/ppp secret');
    const secrets = await menu.where('profile', profileName).get();
    for (const secret of secrets || []) {
      const username = String(secret?.name || '');
      if (!username) continue;
      const rateLimit = secret?.['rate-limit'];
      if (!rateLimit) continue;
      await menu.where('name', username).update({ 'rate-limit': '' });
      updated.push(username);
    }
  });
  return { updatedCount: updated.length };
};

const executeJob = async (job: { id: string; type: string; payload: any; attempts: number; maxAttempts: number }) => {
  if (job.type === 'bulk_reset_rate_limit_by_profile') {
    const payload = job.payload as { profileName: string; requestedById?: string | null; requestId?: string | null };
    const result = await executeBulkResetRateLimit({ profileName: payload.profileName });
    await auditLogSystem({
      action: 'pppoe.profile.bulk_reset_rate_limit.execute',
      userId: payload.requestedById || null,
      requestId: payload.requestId || null,
      targetType: 'ppp_profile',
      targetId: payload.profileName,
      status: 'success',
      meta: { updatedCount: result.updatedCount }
    });
    return;
  }

  throw new Error(`unknown_job_type:${job.type}`);
};

export const startQueueWorker = () => {
  if (!env.queue.enabled || env.nodeEnv === 'test') return;

  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await withQueueLock(async () => {
        const job = await claimNextJob();
        if (!job) return;
        try {
          await executeJob(job);
          await markJobSuccess(job.id);
        } catch (err: any) {
          logQueueError(err, job);
          await markJobFailed(job.id, err?.message || 'error', job.maxAttempts, job.attempts);
        }
      });
    } catch (err) {
      logger.error({ err }, 'queue_worker_failed');
    } finally {
      running = false;
    }
  }, env.queue.pollMs);
};
