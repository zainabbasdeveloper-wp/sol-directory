import { Router } from 'express';
import { getDiagnostics } from '../controllers/admin.diagnostics.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, requireRole('admin'), getDiagnostics);
export default router;
