import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  getContentOverview, listUpdates, runScan, briefUpdate, checkUpdate, publishItem, dismissItem, restoreItem, markRechecked,
} from '../controllers/admin.content.controller.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')];

router.get('/overview', ...adminOnly, getContentOverview);
router.get('/updates', ...adminOnly, listUpdates);
router.post('/scan', ...adminOnly, runScan);
router.post('/updates/:id/brief', ...adminOnly, briefUpdate);
router.get('/updates/:id/check', ...adminOnly, checkUpdate);
router.post('/updates/:id/publish', ...adminOnly, publishItem);
router.post('/updates/:id/dismiss', ...adminOnly, dismissItem);
router.post('/updates/:id/restore', ...adminOnly, restoreItem);
router.post('/updates/:id/rechecked', ...adminOnly, markRechecked);

export default router;
