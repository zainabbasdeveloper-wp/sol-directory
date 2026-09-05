import { Router } from 'express';
import {
  getDashboardOverview, getRecentProviders, getRecentWorkers, getRecentActivity, getUserGrowth,
} from '../controllers/admin.dashboard.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/overview', requireAuth, adminOnly, getDashboardOverview);
router.get('/recent-providers', requireAuth, adminOnly, getRecentProviders);
router.get('/recent-workers', requireAuth, adminOnly, getRecentWorkers);
router.get('/activity', requireAuth, adminOnly, getRecentActivity);
router.get('/user-growth', requireAuth, adminOnly, getUserGrowth);

export default router;
