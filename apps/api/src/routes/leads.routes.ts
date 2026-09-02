import { Router } from 'express';
import { listLeads, unlockLead } from '../controllers/leads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, requireRole('provider'), listLeads);
router.post('/:id/unlock', requireAuth, requireRole('provider'), unlockLead);
export default router;
