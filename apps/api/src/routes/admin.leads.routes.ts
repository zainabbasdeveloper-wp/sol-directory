import { Router } from 'express';
import { getLeadMatches } from '../controllers/admin.leads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/:id/matches', requireAuth, requireRole('admin'), getLeadMatches);
export default router;
