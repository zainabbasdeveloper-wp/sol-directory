import { Router } from 'express';
import { listActiveConditions } from '../controllers/conditions.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, listActiveConditions);
export default router;
