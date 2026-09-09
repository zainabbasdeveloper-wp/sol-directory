import { Router } from 'express';
import { listMemberPlans, setPlanStatus, changePlanTier, getPlanHistory } from '../controllers/admin.plans.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/', requireAuth, adminOnly, listMemberPlans);
router.get('/:id/history', requireAuth, adminOnly, getPlanHistory);
router.patch('/:id/status', requireAuth, adminOnly, setPlanStatus);
router.patch('/:id/plan', requireAuth, adminOnly, changePlanTier);

export default router;
