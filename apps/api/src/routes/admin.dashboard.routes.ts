import { Router } from 'express';
import {
  getDashboardOverview, getRecentProviders, getRecentWorkers, getRecentActivity, getUserGrowth,
  getProviderByState, getWorkerBreakdowns, getProviderActivityTable, searchAdmin,
  getNotifications, markNotificationsRead,
} from '../controllers/admin.dashboard.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/overview', requireAuth, adminOnly, getDashboardOverview);
router.get('/recent-providers', requireAuth, adminOnly, getRecentProviders);
router.get('/recent-workers', requireAuth, adminOnly, getRecentWorkers);
router.get('/activity', requireAuth, adminOnly, getRecentActivity);
router.get('/user-growth', requireAuth, adminOnly, getUserGrowth);
router.get('/providers-by-state', requireAuth, adminOnly, getProviderByState);
router.get('/worker-breakdowns', requireAuth, adminOnly, getWorkerBreakdowns);
router.get('/provider-activity', requireAuth, adminOnly, getProviderActivityTable);
router.get('/search', requireAuth, adminOnly, searchAdmin);
router.get('/notifications', requireAuth, adminOnly, getNotifications);
router.post('/notifications/mark-read', requireAuth, adminOnly, markNotificationsRead);

export default router;
