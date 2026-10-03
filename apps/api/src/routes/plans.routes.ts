import { Router } from 'express';
import { getPlans, getBilling, startCheckout, openBillingPortal } from '../controllers/plans.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, getPlans);
router.get('/billing', requireAuth, requireRole('provider'), getBilling);
router.post('/checkout', requireAuth, requireRole('provider'), startCheckout);
router.post('/portal', requireAuth, requireRole('provider'), openBillingPortal);
export default router;
