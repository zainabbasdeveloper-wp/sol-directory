import { Router } from 'express';
import { getPlans } from '../controllers/plans.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, getPlans);
export default router;
