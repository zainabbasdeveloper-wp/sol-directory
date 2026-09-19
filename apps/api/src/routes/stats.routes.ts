import { Router } from 'express';
import { getPublicStats } from '../controllers/stats.controller.js';

const router = Router();
// Public — aggregate counts only, no personal data. Cached server-side.
router.get('/public', getPublicStats);
export default router;
