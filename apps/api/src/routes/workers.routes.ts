import { Router } from 'express';
import { listWorkers, getWorkerProfile, requestContact } from '../controllers/workers.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// A worker's own purpose in this product is being discoverable and
// finding opportunities — not browsing other workers. Everyone else
// who has a legitimate reason to search the directory can still do
// so.
const canBrowseWorkers = requireRole('provider', 'coordinator', 'participant', 'admin');

router.get('/', requireAuth, canBrowseWorkers, listWorkers);
router.get('/:id', requireAuth, canBrowseWorkers, getWorkerProfile);
router.post('/:id/contact-request', requireAuth, canBrowseWorkers, requestContact);
export default router;
