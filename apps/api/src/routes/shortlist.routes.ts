import { Router } from 'express';
import { listMyShortlist, getShortlistStatus, addToShortlist, removeFromShortlist } from '../controllers/shortlist.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canShortlist = requireRole('coordinator', 'participant');

router.get('/providers', requireAuth, canShortlist, listMyShortlist);
router.get('/providers/:providerId/status', requireAuth, canShortlist, getShortlistStatus);
router.post('/providers/:providerId', requireAuth, canShortlist, addToShortlist);
router.delete('/providers/:providerId', requireAuth, canShortlist, removeFromShortlist);

export default router;
