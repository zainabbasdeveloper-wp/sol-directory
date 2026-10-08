import { Router } from 'express';
import { completeUpload, getOnboarding, saveStep, getUploadUrl } from '../controllers/onboarding.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, requireRole('provider'), getOnboarding);
router.post('/upload-url', requireAuth, requireRole('provider'), getUploadUrl);
router.post('/upload-complete', requireAuth, requireRole('provider'), completeUpload);
router.post('/:stepKey', requireAuth, requireRole('provider'), saveStep);
export default router;
