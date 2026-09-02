import type { Request, Response } from 'express';
import { handleStripeWebhook } from '../services/stripe.service.js';

export async function stripeWebhook(req: Request, res: Response) {
  // TODO: verify req.body against the Stripe-Signature header using
  // stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  // before trusting the payload — this stub trusts the body as-is,
  // which is only acceptable in local development.
  try {
    const result = await handleStripeWebhook(req.body);
    res.json(result);
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
