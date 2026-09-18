import { Router } from 'express';
import { getLeadDetail, listLeads, listNearbyLeads, markLeadViewed, unlockLead, declineLead } from '../controllers/leads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, requireRole('provider'), listLeads);
router.get('/browse/nearby', requireAuth, requireRole('provider'), listNearbyLeads);
router.get('/:id', requireAuth, requireRole('provider'), getLeadDetail);
router.post('/:id/view', requireAuth, requireRole('provider'), markLeadViewed);
router.post('/:id/unlock', requireAuth, requireRole('provider'), unlockLead);
router.post('/:id/decline', requireAuth, requireRole('provider'), declineLead);
export default router;
