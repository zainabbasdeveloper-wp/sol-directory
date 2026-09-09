import { Router } from 'express';
import { listServicesAdmin, createService, updateService, setServiceActive } from '../controllers/admin.services.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/', requireAuth, adminOnly, listServicesAdmin);
router.post('/', requireAuth, adminOnly, createService);
router.patch('/:id', requireAuth, adminOnly, updateService);
router.patch('/:id/active', requireAuth, adminOnly, setServiceActive);

export default router;
