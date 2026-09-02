import { Router } from 'express';
import { listQueue, getQueueDetail, markDocument, approve, reject } from '../controllers/verification.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.get('/', listQueue);
router.get('/:id', getQueueDetail);
router.post('/:id/documents/mark', markDocument);
router.post('/:id/approve', approve);
router.post('/:id/reject', reject);
export default router;
