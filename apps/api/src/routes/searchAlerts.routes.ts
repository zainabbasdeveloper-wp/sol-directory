import { Router } from 'express';
import { createSearchAlert, unsubscribeSearchAlert, verifySearchAlert } from '../controllers/searchAlerts.controller.js';

const router = Router();
router.post('/', createSearchAlert);
router.get('/verify', verifySearchAlert);
router.get('/unsubscribe', unsubscribeSearchAlert);
export default router;