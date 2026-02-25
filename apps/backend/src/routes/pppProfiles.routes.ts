import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import {
  pppProfileCreateSchema,
  pppProfileUpdateSchema,
  pppProfileParamsSchema
} from '../validators/pppProfiles.schema';
import { createProfile, updateProfile, deleteProfileRequest } from '../controllers/pppProfiles.controller';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateBody(pppProfileCreateSchema),
  createProfile
);

router.patch(
  '/:name',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateParams(pppProfileParamsSchema),
  validateBody(pppProfileUpdateSchema),
  updateProfile
);

router.delete(
  '/:name',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateParams(pppProfileParamsSchema),
  deleteProfileRequest
);

export default router;
