import { Router } from 'express';
import { confirmCapacityByToken, confirmCapacityNow, setSmsPreference } from '../controllers/capacity.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/confirm', confirmCapacityByToken); // public — token is the credential
router.post('/confirm-now', requireAuth, requireRole('provider'), confirmCapacityNow);
router.patch('/sms-preference', requireAuth, requireRole('provider'), setSmsPreference);
export default router;
