import { Router } from 'express';
import { getDiagnostics, getEmailLogs } from '../controllers/admin.diagnostics.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, requireRole('admin'), getDiagnostics);
router.get('/email-logs', requireAuth, requireRole('admin'), getEmailLogs);
export default router;
