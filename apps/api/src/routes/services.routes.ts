import { Router } from 'express';
import { listActiveServices } from '../controllers/services.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Any authenticated role can read the active service catalogue —
// this isn't admin-only, since providers/workers/participants all
// need it for selection UIs.
router.get('/', requireAuth, listActiveServices);

export default router;
