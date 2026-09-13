import { Router } from 'express';
import { submitMatchRequest } from '../controllers/matchRequests.controller.js';

const router = Router();
// Public — anonymous site visitors use the "Get Matched" wizard with
// no login, same as it's always worked.
router.post('/', submitMatchRequest);
export default router;
