import { Router } from 'express';
import { listActiveServices } from '../controllers/services.controller.js';

const router = Router();

// The active catalogue is needed by public matching and signup flows.
// Admin mutations remain protected in admin.services.routes.ts.
router.get('/', listActiveServices);

export default router;
