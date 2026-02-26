import app from './app';
import env from './config/env';
import logger from './utils/logger';
import { startMikrotikSync } from './jobs/mikrotikSync';
import { startHistoryRetention } from './jobs/historyRetention';
import { startQueueWorker } from './jobs/queueWorker';

const server = app.listen(env.port, () => {
  logger.info(`Backend listening on port ${env.port}`);
  if (env.nodeEnv !== 'test') {
    startMikrotikSync();
    startHistoryRetention();
    startQueueWorker();
  }
});

server.setTimeout(env.requestTimeoutMs);
