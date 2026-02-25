import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateQuery } from '../middleware/validate';
import { auditQuerySchema } from '../validators/audit.schema';
import { listAuditLogs } from '../controllers/audit.controller';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole([Role.admin]),
  validateQuery(auditQuerySchema),
  listAuditLogs
);

export default router;
