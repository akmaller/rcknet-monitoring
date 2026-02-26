import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';
import { auditLog } from '../services/audit.service';
import { ConnectionStatus } from '@prisma/client';

const buildWhere = (req: Request) => {
  const status = req.query.status as ConnectionStatus | undefined;
  const search = (req.query.search as string | undefined) || undefined;
  const profile = (req.query.profile as string | undefined) || undefined;
  const comment = (req.query.comment as string | undefined) || undefined;

  const where: any = {};
  if (status) where.status = status;
  if (search) where.username = { contains: search, mode: 'insensitive' };
  if (profile) where.profile = { contains: profile, mode: 'insensitive' };
  if (comment) where.comment = { contains: comment, mode: 'insensitive' };

  return { where, status, search, profile, comment };
};

export const listCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = (req.query.limit as number | undefined) ?? 100;
    const offset = (req.query.offset as number | undefined) ?? 0;
    const { where, status, search, profile, comment } = buildWhere(req);

    const data = await prisma.customerStatus.findMany({
      where,
      orderBy: { username: 'asc' },
      take: Math.min(limit, 1000),
      skip: Math.max(offset, 0)
    });

    const safeData = data.map((item) => ({
      ...item,
      id: item.id.toString()
    }));

    await auditLog({
      action: 'customers.list',
      userId: req.session.user?.id,
      req,
      meta: { limit, offset, status, search, profile, comment }
    });

    res.json({ data: safeData });
  } catch (err) {
    next(err);
  }
};

export const customersStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { where, status, search, profile, comment } = buildWhere(req);

    const [total, online, offline] = await Promise.all([
      prisma.customerStatus.count({ where }),
      prisma.customerStatus.count({ where: { ...where, status: ConnectionStatus.online } }),
      prisma.customerStatus.count({ where: { ...where, status: ConnectionStatus.offline } })
    ]);

    await auditLog({
      action: 'customers.stats',
      userId: req.session.user?.id,
      req,
      meta: { status, search, profile, comment }
    });

    res.json({ data: { total, online, offline } });
  } catch (err) {
    next(err);
  }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;
    const data = await prisma.customerStatus.findUnique({ where: { username } });

    await auditLog({
      action: 'customers.get',
      userId: req.session.user?.id,
      req,
      meta: { username }
    });

    if (!data) {
      return res.status(404).json({ error: 'Not Found' });
    }

    res.json({
      data: {
        ...data,
        id: data.id.toString()
      }
    });
  } catch (err) {
    next(err);
  }
};
