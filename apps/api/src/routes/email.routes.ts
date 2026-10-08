import { Router } from 'express';
import { unsubscribe } from '../controllers/emailPreferences.controller.js';

const router = Router();
// Public on purpose: the signed link in the email is the credential (see emailTokens.ts).
router.get('/unsubscribe', (req, res, next) => unsubscribe(req, res).catch(next));
router.post('/unsubscribe', (req, res, next) => unsubscribe(req, res).catch(next));

export default router;
