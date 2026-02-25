import cron from 'node-cron';
import prisma from '../db/prisma';
import env from '../config/env';
import logger from '../utils/logger';

const retentionCron = '0 3 * * *';

const purgeHistory = async () => {
  if (!env.historyEnabled || env.historyRetentionDays <= 0) return;
  const cutoff = new Date(Date.now() - env.historyRetentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.customerStatusEvent.deleteMany({
    where: { eventAt: { lt: cutoff } }
  });
  logger.info({ deleted: result.count }, 'history_retention_purge');
};

export const startHistoryRetention = () => {
  cron.schedule(retentionCron, async () => {
    try {
      await purgeHistory();
    } catch (err) {
      logger.error({ err }, 'history_retention_failed');
    }
  });
};
