import { Router } from 'express';
import { receiveWordPressWebhook, getLastChanged } from '../controllers/webhooks.controller.js';

const router = Router();
router.post('/wordpress', receiveWordPressWebhook);
router.get('/wordpress/last-changed', getLastChanged);
export default router;
