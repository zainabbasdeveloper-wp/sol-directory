import { Router } from 'express';
import { getMyReferrals } from '../controllers/referrals.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/me', requireAuth, requireRole('provider'), getMyReferrals);
export default router;
