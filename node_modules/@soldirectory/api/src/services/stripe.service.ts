import WebhookEvent from '../models/WebhookEvent.js';
import Provider from '../models/Provider.js';

/**
 * Subscription state is server-owned with the payment webhook as
 * source of truth (per spec). There is deliberately no
 * `POST /api/plans/switch`-style endpoint that lets a client set its
 * own plan — a plan change only ever happens because Stripe told us
 * it happened, via this handler.
 *
 * Stub verification below — swap for real `stripe.webhooks.constructEvent`
 * once STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are set.
 */

interface StripeWebhookPayload {
  id: string; // Stripe event id — used as the idempotency key
  type: string;
  data: {
    object: {
      customer: string; // maps to Provider.stripeCustomerId
      metadata?: { planKey?: string };
    };
  };
}

export async function handleStripeWebhook(payload: StripeWebhookPayload): Promise<{ handled: boolean }> {
  // Idempotency: Stripe redelivers events on timeout/failure. A
  // unique index on WebhookEvent.stripeEventId means a redelivery is
  // a no-op rather than a double-applied plan change.
  try {
    await WebhookEvent.create({ stripeEventId: payload.id, type: payload.type });
  } catch (err: any) {
    if (err.code === 11000) {
      return { handled: false }; // already processed
    }
    throw err;
  }

  if (payload.type === 'customer.subscription.updated' || payload.type === 'customer.subscription.created') {
    const planKey = payload.data.object.metadata?.planKey;
    if (planKey) {
      await Provider.updateOne(
        { stripeCustomerId: payload.data.object.customer },
        { $set: { plan: planKey, leadUnlocksUsedThisPeriod: 0 } }
      );
    }
  }

  if (payload.type === 'customer.subscription.deleted') {
    await Provider.updateOne(
      { stripeCustomerId: payload.data.object.customer },
      { $set: { plan: 'starter', leadUnlocksUsedThisPeriod: 0 } }
    );
  }

  return { handled: true };
}
