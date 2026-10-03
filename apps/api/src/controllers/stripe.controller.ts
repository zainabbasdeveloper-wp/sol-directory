import type { Request, Response } from 'express';
import { getStripe, processStripeEvent } from '../services/stripe.service.js';

/**
 * POST /api/stripe/webhook — Stripe's event delivery (see services/stripe.service.ts).
 *
 * The body is read RAW (routes/stripe.routes.ts): the signature is computed over
 * the exact bytes Stripe sent, so it can't have been through express.json() first.
 * Anything that doesn't carry a valid signature for STRIPE_WEBHOOK_SECRET is
 * rejected before it can touch a provider's plan.
 */
export async function stripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    console.error('[stripe] webhook received but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are not set');
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') return res.status(400).json({ error: 'Missing Stripe-Signature header' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, secret);
  } catch (err) {
    console.warn('[stripe] webhook signature check failed:', (err as Error).message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    const { handled } = await processStripeEvent(event);
    return res.json({ received: true, handled });
  } catch (err) {
    // 500 so Stripe retries; processStripeEvent has already released the idempotency record.
    console.error(`[stripe] failed to process ${event.type} (${event.id}):`, err);
    return res.status(500).json({ error: 'Failed to process event' });
  }
}
