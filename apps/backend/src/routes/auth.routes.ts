import { Router } from 'express';
import { loginLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators/auth.schema';
import { login, logout, me, csrfToken } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/csrf', csrfToken);
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
