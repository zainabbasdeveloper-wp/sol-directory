import { Router } from 'express';
import { listEmailLogs } from '../controllers/admin.emailLogs.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, requireRole('admin'), listEmailLogs);
export default router;
