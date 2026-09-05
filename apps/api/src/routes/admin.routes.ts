import { Router } from 'express';
import { listProvidersAdmin, getProviderAdmin, setProviderAccountStatus } from '../controllers/admin.providers.controller.js';
import { listWorkersAdmin, getWorkerAdmin, setWorkerAccountStatus } from '../controllers/admin.workers.controller.js';
import { listUsersAdmin, getUserAdmin, setUserAccountStatus } from '../controllers/admin.users.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/providers', requireAuth, adminOnly, listProvidersAdmin);
router.get('/providers/:id', requireAuth, adminOnly, getProviderAdmin);
router.patch('/providers/:id/status', requireAuth, adminOnly, setProviderAccountStatus);

router.get('/workers', requireAuth, adminOnly, listWorkersAdmin);
router.get('/workers/:id', requireAuth, adminOnly, getWorkerAdmin);
router.patch('/workers/:id/status', requireAuth, adminOnly, setWorkerAccountStatus);

// Coordinators and participants — both handled by the same
// admin.users.controller, since neither has a separate profile model.
router.get('/users', requireAuth, adminOnly, listUsersAdmin);
router.get('/users/:id', requireAuth, adminOnly, getUserAdmin);
router.patch('/users/:id/status', requireAuth, adminOnly, setUserAccountStatus);

export default router;
