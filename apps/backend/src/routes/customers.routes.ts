import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { listCustomers, customersStats, getCustomer } from '../controllers/customers.controller';
import { validateQuery, validateParams } from '../middleware/validate';
import { customersQuerySchema, customersStatsQuerySchema, customerParamsSchema } from '../validators/customers.schema';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole([Role.admin, Role.operator, Role.viewer]),
  validateQuery(customersQuerySchema),
  listCustomers
);

router.get(
  '/stats',
  requireAuth,
  requireRole([Role.admin, Role.operator, Role.viewer]),
  validateQuery(customersStatsQuerySchema),
  customersStats
);

router.get(
  '/:username',
  requireAuth,
  requireRole([Role.admin, Role.operator, Role.viewer]),
  validateParams(customerParamsSchema),
  getCustomer
);

export default router;
