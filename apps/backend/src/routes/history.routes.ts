import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateQuery, validateParams } from '../middleware/validate';
import { historyQuerySchema } from '../validators/history.schema';
import { customerParamsSchema } from '../validators/customers.schema';
import { getCustomerHistory } from '../controllers/history.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/customers/:username/history',
  requireAuth,
  requireRole([Role.admin, Role.operator, Role.viewer]),
  validateParams(customerParamsSchema),
  validateQuery(historyQuerySchema),
  getCustomerHistory
);

export default router;
