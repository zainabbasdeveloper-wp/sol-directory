import { Router } from 'express';
import { getLeadMatches, getLeadDeliveries, listAdminLeads, shareLeadWithProvider, searchSharableProviders } from '../controllers/admin.leads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')] as const;
router.get('/', ...adminOnly, listAdminLeads);
router.get('/providers', ...adminOnly, searchSharableProviders);
router.get('/:id/deliveries', ...adminOnly, getLeadDeliveries);
router.post('/:id/share', ...adminOnly, shareLeadWithProvider);
router.get('/:id/matches', ...adminOnly, getLeadMatches);
export default router;
