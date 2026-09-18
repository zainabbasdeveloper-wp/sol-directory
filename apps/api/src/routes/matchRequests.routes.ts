import { Router } from 'express';
import { submitMatchRequest, saveMatchRequestDraft } from '../controllers/matchRequests.controller.js';

const router = Router();
// Public — anonymous site visitors use the "Get Matched" wizard with
// no login, same as it's always worked.
router.post('/', submitMatchRequest);
router.post('/draft', saveMatchRequestDraft);
export default router;
