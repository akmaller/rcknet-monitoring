import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { changeRequestConfirmSchema, changeRequestParamsSchema } from '../validators/changeRequests.schema';
import { confirmRequest } from '../controllers/changeRequests.controller';
import { writeLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/:id/confirm',
  requireAuth,
  requireRole([Role.admin]),
  writeLimiter,
  validateParams(changeRequestParamsSchema),
  validateBody(changeRequestConfirmSchema),
  confirmRequest
);

export default router;
