import type { Response } from 'express';
import PlanConfig from '../models/PlanConfig.js';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import { getActiveProviderForUser } from '../utils/getActiveProvider.js';
import { BillingError, createCheckoutSession, createPortalSession, getStripe } from '../services/stripe.service.js';

export async function getPlans(req: AuthedRequest, res: Response) {
  const plans = await PlanConfig.find({ key: { $in: ['starter', 'growth', 'pro'] } }).sort({ priceCents: 1 }).lean();
  res.json(plans);
}

// Deliberately no switchPlan() here. Plan changes are initiated through Stripe
// Checkout / the Billing Portal, and only take effect once the resulting
// webhook is processed by services/stripe.service.ts (routes/stripe.routes.ts).

/** What the Plans page needs to show the provider's current subscription. */
export async function getBilling(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  res.json({
    plan: provider.plan,
    planStatus: provider.planStatus,
    renewsOrEndsAt: provider.planExpiresAt ?? null,
    hasBillingAccount: !!provider.stripeCustomerId,
    leadUnlocksUsed: provider.leadUnlocksUsedThisPeriod,
    paymentsEnabled: !!getStripe(),
  });
}

function sendBillingError(res: Response, err: unknown) {
  if (err instanceof BillingError) return res.status(err.status).json({ error: err.message, code: err.code });
  console.error('[billing]', err);
  return res.status(502).json({ error: 'We could not reach our payment provider. Please try again shortly.' });
}

export async function startCheckout(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  try {
    res.json(await createCheckoutSession(provider, String(req.body?.planKey ?? '')));
  } catch (err) {
    sendBillingError(res, err);
  }
}

export async function openBillingPortal(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  try {
    res.json(await createPortalSession(provider));
  } catch (err) {
    sendBillingError(res, err);
  }
}
