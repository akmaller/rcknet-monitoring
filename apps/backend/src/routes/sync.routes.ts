import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getMikrotikSyncStatus, getMikrotikSystemInfo } from '../controllers/sync.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get('/mikrotik', requireAuth, requireRole([Role.admin, Role.operator]), getMikrotikSyncStatus);
router.get('/mikrotik/info', requireAuth, requireRole([Role.admin, Role.operator, Role.viewer]), getMikrotikSystemInfo);

export default router;
