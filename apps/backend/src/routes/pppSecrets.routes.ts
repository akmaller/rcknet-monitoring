import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import {
  pppSecretCreateSchema,
  pppSecretUpdateSchema,
  pppSecretParamsSchema
} from '../validators/pppSecrets.schema';
import { createSecret, updateSecret, deleteSecretRequest } from '../controllers/pppSecrets.controller';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateBody(pppSecretCreateSchema),
  createSecret
);

router.patch(
  '/:username',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateParams(pppSecretParamsSchema),
  validateBody(pppSecretUpdateSchema),
  updateSecret
);

router.delete(
  '/:username',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateParams(pppSecretParamsSchema),
  deleteSecretRequest
);

export default router;
