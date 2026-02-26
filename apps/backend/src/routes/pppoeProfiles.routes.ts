import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import {
  pppoeProfileCreateSchema,
  pppoeProfilePatchSchema,
  pppoeProfileParamsSchema,
  pppoeProfileQuerySchema
} from '../validators/pppoeProfiles.schema';
import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  bulkResetProfileUserRateLimit
} from '../controllers/pppoeProfiles.controller';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  validateQuery(pppoeProfileQuerySchema),
  listProfiles
);

router.post(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeProfileQuerySchema),
  validateBody(pppoeProfileCreateSchema),
  createProfile
);

router.patch(
  '/:name',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeProfileQuerySchema),
  validateParams(pppoeProfileParamsSchema),
  validateBody(pppoeProfilePatchSchema),
  updateProfile
);

router.delete(
  '/:name',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateQuery(pppoeProfileQuerySchema),
  validateParams(pppoeProfileParamsSchema),
  deleteProfile
);

router.post(
  '/:name/reset-user-rate-limits',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateParams(pppoeProfileParamsSchema),
  bulkResetProfileUserRateLimit
);

export default router;
