import { Router } from 'express';
import { listMyNotifications, markNotificationRead } from '../controllers/notifications.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, listMyNotifications);
router.patch('/:id/read', requireAuth, markNotificationRead);
export default router;
