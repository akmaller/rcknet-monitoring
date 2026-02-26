import prisma from '../db/prisma';
import logger from '../utils/logger';
import { Prisma } from '@prisma/client';

export type QueueJobStatus = 'queued' | 'processing' | 'success' | 'failed';

export type QueueJobRecord = {
  id: string;
  type: string;
  payload: unknown;
  status: QueueJobStatus;
  attempts: number;
  maxAttempts: number;
};

export const enqueueJob = async (type: string, payload: Record<string, unknown>, maxAttempts?: number) => {
  return prisma.queueJob.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      status: 'queued',
      maxAttempts: maxAttempts ?? 3
    }
  });
};

export const claimNextJob = async (): Promise<QueueJobRecord | null> => {
  return prisma.$transaction(async (tx) => {
    const rows = (await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM queue_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`) as Array<{
      id: string;
    }>;

    const next = rows[0];
    if (!next) return null;

    const job = await tx.queueJob.update({
      where: { id: next.id },
      data: {
        status: 'processing',
        startedAt: new Date(),
        attempts: { increment: 1 }
      }
    });

    return job as QueueJobRecord;
  });
};

export const markJobSuccess = async (id: string) => {
  return prisma.queueJob.update({
    where: { id },
    data: { status: 'success', finishedAt: new Date(), lastError: null }
  });
};

export const markJobFailed = async (id: string, error: string, maxAttempts: number, attempts: number) => {
  const shouldRetry = attempts < maxAttempts;
  return prisma.queueJob.update({
    where: { id },
    data: {
      status: shouldRetry ? 'queued' : 'failed',
      lastError: error,
      finishedAt: shouldRetry ? null : new Date()
    }
  });
};

export const logQueueError = (err: unknown, job?: QueueJobRecord) => {
  logger.error({ err, jobId: job?.id, jobType: job?.type }, 'queue_job_failed');
};
