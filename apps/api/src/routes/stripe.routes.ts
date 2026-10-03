import express, { Router } from 'express';
import { stripeWebhook } from '../controllers/stripe.controller.js';

const router = Router();
// Raw body, not JSON — Stripe signs the exact bytes. Mounted in index.ts BEFORE express.json().
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
export default router;
