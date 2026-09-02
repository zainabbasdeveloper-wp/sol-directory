import { Router } from 'express';
import { listWorkers, getWorkerProfile, requestContact } from '../controllers/workers.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, listWorkers);
router.get('/:id', requireAuth, getWorkerProfile);
router.post('/:id/contact-request', requireAuth, requestContact);
export default router;
