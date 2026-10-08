import mongoose from 'mongoose';
import Stripe from 'stripe';
import WebhookEvent from '../models/WebhookEvent.js';
import Provider, { type ProviderDoc } from '../models/Provider.js';
import PlanConfig from '../models/PlanConfig.js';
import User from '../models/User.js';
import { logActivity } from '../models/AdminActivity.js';
import { EmailService } from './email.service.js';

/**
 * Provider subscriptions (lead plans), paid through Stripe.
 *
 * Subscription state is server-owned with the payment webhook as source of
 * truth (per spec). There is deliberately no endpoint that lets a client set
 * its own plan: checkout only starts a Stripe payment, and a plan change only
 * ever happens because Stripe told us it happened, via processStripeEvent().
 *
 * Env (apps/api/.env):
 *   STRIPE_SECRET_KEY       sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET   whsec_… for the endpoint {site}/api/stripe/webhook
 *   STRIPE_CURRENCY         optional, default "aud"
 *   STRIPE_PRICE_GROWTH / STRIPE_PRICE_PRO   optional price_… ids. Without them
 *                           the checkout builds the price from PlanConfig
 *                           (Admin -> Plans), so a price edited there is what
 *                           customers are charged.
 *   CLIENT_ORIGIN           the public site URL — used for the checkout return
 *                           URLs and the links in billing emails.
 *   ADMIN_NOTIFICATION_EMAIL  optional — gets an email for each new
 *                           subscription, failed payment and cancellation.
 */

export const PAID_PLAN_KEYS = ['growth', 'pro'] as const;
export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];
export const isPaidPlanKey = (key: unknown): key is PaidPlanKey => PAID_PLAN_KEYS.includes(key as PaidPlanKey);

/** Thrown for problems the provider should be told about (maps to an HTTP status in the controller). */
export class BillingError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let client: { key: string; stripe: Stripe } | null = null;
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client || client.key !== key) client = { key, stripe: new Stripe(key) };
  return client.stripe;
}

const siteOrigin = () => (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
const providerName = (p: ProviderDoc) => p.tradingName || p.legalEntityName || 'there';

async function ownerOf(provider: ProviderDoc) {
  return User.findById(provider.userId).select('email name').lean();
}

async function ensureCustomer(stripe: Stripe, provider: ProviderDoc): Promise<string> {
  if (provider.stripeCustomerId) return provider.stripeCustomerId;
  const owner = await ownerOf(provider);
  const customer = await stripe.customers.create({
    email: owner?.email,
    name: providerName(provider),
    metadata: { providerId: String(provider._id) },
  });
  await Provider.updateOne({ _id: provider._id }, { $set: { stripeCustomerId: customer.id } });
  provider.stripeCustomerId = customer.id;
  return customer.id;
}

/** Starts a Stripe Checkout subscription for a paid plan. The plan itself is only applied by the webhook. */
export async function createCheckoutSession(provider: ProviderDoc, planKey: string): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new BillingError('Payments are not set up yet. Please contact support.', 503, 'STRIPE_NOT_CONFIGURED');
  if (!isPaidPlanKey(planKey)) throw new BillingError('Choose a paid plan.', 400, 'INVALID_PLAN');

  const plan = await PlanConfig.findOne({ key: planKey }).lean();
  if (!plan || !plan.priceCents) throw new BillingError('That plan is not available.', 400, 'INVALID_PLAN');

  if (provider.stripeSubscriptionId && provider.plan !== 'starter' && provider.planStatus === 'active') {
    throw new BillingError('You already have an active plan. Use “Manage billing” to change or cancel it.', 409, 'USE_PORTAL');
  }

  const customer = await ensureCustomer(stripe, provider);
  const priceId = process.env[`STRIPE_PRICE_${planKey.toUpperCase()}`];
  const quotaText = plan.quota === null ? 'Unlimited lead unlocks' : `${plan.quota} lead unlocks per month`;
  const meta = { planKey, providerId: String(provider._id) };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: String(provider._id),
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: (process.env.STRIPE_CURRENCY ?? 'aud').toLowerCase(),
              unit_amount: plan.priceCents,
              recurring: { interval: 'month' },
              product_data: { name: `SolDirectory ${plan.name} plan`, description: quotaText },
            },
          },
    ],
    metadata: meta,
    subscription_data: { metadata: meta },
    allow_promotion_codes: true,
    success_url: `${siteOrigin()}/plans?checkout=success`,
    cancel_url: `${siteOrigin()}/plans?checkout=cancelled`,
  });
  if (!session.url) throw new BillingError('Could not start checkout. Please try again.', 502);
  return { url: session.url };
}

/** Stripe's hosted page for updating a card, viewing invoices, switching plan or cancelling. */
export async function createPortalSession(provider: ProviderDoc): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new BillingError('Payments are not set up yet. Please contact support.', 503, 'STRIPE_NOT_CONFIGURED');
  if (!provider.stripeCustomerId) throw new BillingError('You have no billing account yet — subscribe to a plan first.', 409, 'NO_CUSTOMER');
  try {
    const session = await stripe.billingPortal.sessions.create({ customer: provider.stripeCustomerId, return_url: `${siteOrigin()}/plans` });
    return { url: session.url };
  } catch (err) {
    // The portal must be switched on once in the Stripe dashboard (Settings -> Billing -> Customer portal).
    console.error('[stripe] billing portal failed:', (err as Error).message);
    throw new BillingError('The billing portal is not available yet. Please contact support.', 502, 'PORTAL_UNAVAILABLE');
  }
}

// ---------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------

const dateOf = (unixSeconds?: number | null) => (unixSeconds ? new Date(unixSeconds * 1000) : undefined);
const longDate = (d?: Date) => (d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined);
const idOf = (v: unknown): string | undefined => (typeof v === 'string' ? v : (v as { id?: string } | null)?.id);

/** Loads a provider, applies a change and saves — retrying when two webhook events for the same provider race each other. */
async function updateProvider(find: () => Promise<ProviderDoc | null>, mutate: (p: ProviderDoc) => void | Promise<void>): Promise<ProviderDoc | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const provider = await find();
    if (!provider) return null;
    await mutate(provider);
    try {
      await provider.save();
      return provider;
    } catch (err) {
      if ((err as Error).name !== 'VersionError') throw err;
    }
  }
  throw new Error('Could not save the provider after several attempts');
}

const findProvider = (customerId?: string, providerId?: string) => async (): Promise<ProviderDoc | null> => {
  if (providerId && mongoose.isValidObjectId(providerId)) {
    const byId = await Provider.findById(providerId);
    if (byId) return byId;
  }
  return customerId ? Provider.findOne({ stripeCustomerId: customerId }) : null;
};

function recordPlan(provider: ProviderDoc, plan: string, planStatus: ProviderDoc['planStatus']): boolean {
  const changed = provider.plan !== plan || provider.planStatus !== planStatus;
  if (provider.plan !== plan) provider.planStartedAt = new Date();
  provider.plan = plan as ProviderDoc['plan'];
  provider.planStatus = planStatus;
  if (changed) provider.planHistory.push({ plan, planStatus, changedAt: new Date(), changedBy: 'system' });
  return changed;
}

/** Which plan a subscription is for: the metadata we set at checkout, else the plan whose price matches. */
async function planKeyOf(sub: any): Promise<PaidPlanKey | null> {
  const fromMeta = sub?.metadata?.planKey;
  if (isPaidPlanKey(fromMeta)) return fromMeta;
  const amount = sub?.items?.data?.[0]?.price?.unit_amount;
  if (amount == null) return null;
  const match = await PlanConfig.findOne({ key: { $in: [...PAID_PLAN_KEYS] }, priceCents: amount }).lean();
  return match && isPaidPlanKey(match.key) ? match.key : null;
}

/** Period end moved off the subscription onto its items in newer Stripe API versions; read either. */
const periodEndOf = (sub: any): Date | undefined => dateOf(sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end);

async function tellAdmin(title: string, message: string) {
  await EmailService.notifyAdmin(title, message, `${siteOrigin()}/admin/plans`);
}

async function tellProvider(provider: ProviderDoc, send: (to: string) => Promise<unknown>) {
  const owner = await ownerOf(provider);
  if (owner?.email) await send(owner.email);
}

/** Sent once, by whichever of checkout.session.completed / customer.subscription.* activates the plan first (Stripe doesn't promise their order). */
async function welcomeSubscriber(provider: ProviderDoc, planKey: PaidPlanKey) {
  const plan = await PlanConfig.findOne({ key: planKey }).lean();
  const quotaText = plan?.quota === null ? 'You have unlimited lead unlocks.' : `You have ${plan?.quota ?? 0} lead unlocks each month.`;
  await tellProvider(provider, (to) => EmailService.sendSubscriptionStarted(to, { name: providerName(provider), planName: plan?.name ?? planKey, quotaText, leadsUrl: `${siteOrigin()}/leads` }));
  const summary = `${providerName(provider)} subscribed to the ${plan?.name ?? planKey} plan`;
  await logActivity('plan_changed', summary);
  await tellAdmin('New subscription', `${summary}.`);
}

/** True when this write moves the provider onto a paid plan they were not already actively on. */
const startsPlan = (p: ProviderDoc, planKey: string) => p.plan !== planKey || p.planStatus === 'cancelled' || p.planStatus === 'expired';

async function onCheckoutCompleted(session: any) {
  if (session.mode !== 'subscription') return;
  if (session.payment_status && !['paid', 'no_payment_required'].includes(session.payment_status)) return;
  const planKey = session.metadata?.planKey;
  if (!isPaidPlanKey(planKey)) return;

  let starts = false;
  const provider = await updateProvider(findProvider(idOf(session.customer), session.metadata?.providerId ?? session.client_reference_id), (p) => {
    starts = startsPlan(p, planKey);
    const customer = idOf(session.customer);
    if (customer && !p.stripeCustomerId) p.stripeCustomerId = customer;
    p.stripeSubscriptionId = idOf(session.subscription) ?? p.stripeSubscriptionId;
    recordPlan(p, planKey, 'active');
    if (starts) p.leadUnlocksUsedThisPeriod = 0;
  });
  if (!provider) return console.warn(`[stripe] checkout.session.completed for an unknown provider (customer ${idOf(session.customer)})`);
  if (starts) await welcomeSubscriber(provider, planKey);
}

async function onSubscriptionChanged(sub: any) {
  const status: string = sub.status;
  const customer = idOf(sub.customer);

  // A subscription Stripe has given up on is the same as a cancelled one.
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(status)) return onSubscriptionEnded(sub);
  const planKey = await planKeyOf(sub);
  if (!planKey || !['active', 'trialing', 'past_due'].includes(status)) return; // incomplete / paused: nothing to apply yet

  let starts = false;
  const provider = await updateProvider(findProvider(customer, sub.metadata?.providerId), (p) => {
    starts = startsPlan(p, planKey);
    p.stripeSubscriptionId = sub.id;
    if (customer && !p.stripeCustomerId) p.stripeCustomerId = customer;
    recordPlan(p, planKey, status === 'trialing' ? 'trial' : 'active');
    if (starts) p.leadUnlocksUsedThisPeriod = 0;
    // Next renewal — or, if the subscription is set to end, the day access stops.
    const end = periodEndOf(sub);
    if (end) { p.planExpiresAt = end; p.periodResetsAt = end; }
  });
  if (!provider) return console.warn(`[stripe] subscription ${sub.id} for an unknown provider (customer ${customer})`);
  if (starts) await welcomeSubscriber(provider, planKey);
}

async function onSubscriptionEnded(sub: any) {
  const outcome = { applied: false, planName: '' };
  const provider = await updateProvider(findProvider(idOf(sub.customer), sub.metadata?.providerId), async (p) => {
    // A late event for an old subscription must not wipe out a newer one.
    if (p.stripeSubscriptionId && sub.id && p.stripeSubscriptionId !== sub.id) return;
    const planDoc = await PlanConfig.findOne({ key: p.plan }).lean();
    outcome.planName = planDoc?.name ?? p.plan;
    outcome.applied = p.plan !== 'starter';
    recordPlan(p, 'starter', 'cancelled');
    p.stripeSubscriptionId = undefined;
    p.planExpiresAt = undefined;
    p.periodResetsAt = undefined;
    p.leadUnlocksUsedThisPeriod = 0;
  });
  if (!provider || !outcome.applied) return;
  await tellProvider(provider, (to) => EmailService.sendSubscriptionCancelled(to, { name: providerName(provider), planName: outcome.planName, plansUrl: `${siteOrigin()}/plans` }));
  const summary = `${providerName(provider)}'s ${outcome.planName} plan ended`;
  await logActivity('plan_changed', summary);
  await tellAdmin('Subscription ended', `${summary}.`);
}

async function onInvoicePaid(invoice: any) {
  if (invoice.billing_reason !== 'subscription_cycle' || !invoice.amount_paid) return; // first payment is covered by the welcome email
  const line = invoice.lines?.data?.[0];
  const periodEnd = dateOf(line?.period?.end);
  const provider = await updateProvider(findProvider(idOf(invoice.customer)), (p) => {
    p.leadUnlocksUsedThisPeriod = 0; // a new paid month starts with a full allowance
    if (periodEnd) { p.planExpiresAt = periodEnd; p.periodResetsAt = periodEnd; }
  });
  if (!provider) return;
  const planDoc = await PlanConfig.findOne({ key: provider.plan }).lean();
  const amount = new Intl.NumberFormat('en-AU', { style: 'currency', currency: String(invoice.currency ?? 'aud').toUpperCase() }).format(invoice.amount_paid / 100);
  await tellProvider(provider, (to) => EmailService.sendPaymentReceived(to, { name: providerName(provider), planName: planDoc?.name ?? provider.plan, amount, nextBilling: longDate(periodEnd), billingUrl: `${siteOrigin()}/plans` }));
}

async function onPaymentFailed(invoice: any) {
  const provider = await findProvider(idOf(invoice.customer))();
  if (!provider) return;
  const planDoc = await PlanConfig.findOne({ key: provider.plan }).lean();
  await tellProvider(provider, (to) => EmailService.sendPaymentFailed(to, { name: providerName(provider), planName: planDoc?.name ?? provider.plan, billingUrl: `${siteOrigin()}/plans` }));
  const summary = `Payment failed for ${providerName(provider)} (${planDoc?.name ?? provider.plan} plan)`;
  await logActivity('payment_failed', summary);
  await tellAdmin('Payment failed', `${summary}. Stripe will retry automatically.`);
}

async function dispatch(event: Stripe.Event) {
  const object = event.data.object as any;
  switch (event.type) {
    case 'checkout.session.completed': return onCheckoutCompleted(object);
    case 'customer.subscription.created':
    case 'customer.subscription.updated': return onSubscriptionChanged(object);
    case 'customer.subscription.deleted': return onSubscriptionEnded(object);
    case 'invoice.paid': return onInvoicePaid(object);
    case 'invoice.payment_failed': return onPaymentFailed(object);
    default: return undefined;
  }
}

/**
 * Applies a signature-verified Stripe event exactly once. Stripe redelivers on
 * timeout or error, so the event id is recorded first (unique index) and a
 * repeat is a no-op — but if applying it fails, the record is removed again so
 * Stripe's retry gets another go instead of being swallowed as "already done".
 */
export async function processStripeEvent(event: Stripe.Event): Promise<{ handled: boolean }> {
  try {
    await WebhookEvent.create({ stripeEventId: event.id, type: event.type });
  } catch (err: any) {
    if (err.code === 11000) return { handled: false };
    throw err;
  }
  try {
    await dispatch(event);
    return { handled: true };
  } catch (err) {
    await WebhookEvent.deleteOne({ stripeEventId: event.id }).catch(() => {});
    throw err;
  }
}
