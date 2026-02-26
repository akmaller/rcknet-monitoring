import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import {
  pppoeUserCreateSchema,
  pppoeUserPatchSchema,
  pppoeUserParamsSchema,
  pppoeUserQuerySchema
} from '../validators/pppoeUsers.schema';
import {
  createPppoeUser,
  listPppoeUsers,
  updatePppoeUser,
  deletePppoeUser,
  disablePppoeUser,
  enablePppoeUser,
  resetPppoeUserRateLimit
} from '../controllers/pppoeUsers.controller';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeUserQuerySchema),
  validateBody(pppoeUserCreateSchema),
  createPppoeUser
);

router.get(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  listPppoeUsers
);

router.patch(
  '/:name',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeUserQuerySchema),
  validateParams(pppoeUserParamsSchema),
  validateBody(pppoeUserPatchSchema),
  updatePppoeUser
);

router.delete(
  '/:name',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeUserQuerySchema),
  validateParams(pppoeUserParamsSchema),
  deletePppoeUser
);

router.post(
  '/:name/disable',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeUserQuerySchema),
  validateParams(pppoeUserParamsSchema),
  disablePppoeUser
);

router.post(
  '/:name/enable',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeUserQuerySchema),
  validateParams(pppoeUserParamsSchema),
  enablePppoeUser
);

router.post(
  '/:name/reset-rate-limit',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeUserQuerySchema),
  validateParams(pppoeUserParamsSchema),
  resetPppoeUserRateLimit
);

export default router;
