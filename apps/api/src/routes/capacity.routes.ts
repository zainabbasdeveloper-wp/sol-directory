import { Router } from 'express';
import { confirmCapacityByToken, confirmCapacityNow } from '../controllers/capacity.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/confirm', confirmCapacityByToken); // public — token is the credential
router.post('/confirm-now', requireAuth, requireRole('provider'), confirmCapacityNow);
export default router;
