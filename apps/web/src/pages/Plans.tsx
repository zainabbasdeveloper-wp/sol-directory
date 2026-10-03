import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBilling, getPlans, openBillingPortal, startCheckout, type Billing } from '../api/resources';
import { ApiError } from '../api/client';
import type { PlanConfig } from '@soldirectory/shared-types';
import './Plans.css';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Plans() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const checkout = params.get('checkout');

  const loadBilling = useCallback(() => getBilling().then(setBilling).catch(() => {}), []);

  useEffect(() => {
    Promise.all([getPlans().then(setPlans), loadBilling()]).finally(() => setLoading(false));
  }, [loadBilling]);

  // Back from Stripe: the plan changes when Stripe's webhook arrives, usually within seconds, so keep checking briefly.
  useEffect(() => {
    if (checkout !== 'success') return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      loadBilling();
      if (tries >= 10) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [checkout, loadBilling]);

  async function go(action: string, request: () => Promise<{ url: string }>) {
    setBusy(action);
    setError('');
    try {
      const { url } = await request();
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  }

  if (loading) return <div className="plans-page">Loading…</div>;

  const current = billing?.plan ?? 'starter';
  const onPaidPlan = current !== 'starter' && billing?.planStatus === 'active';
  const paymentsEnabled = billing?.paymentsEnabled ?? false;
  const planName = (key: string) => plans.find((p) => p.key === key)?.name ?? key;
  const dismiss = () => setParams({}, { replace: true });

  return (
    <div className="plans-page">
      <div className="plans-header">
        <h1 className="page-title">Plans and billing</h1>
        {billing && (
          <p className="plans-footnote" style={{ marginTop: 8 }}>
            You are on the <strong>{planName(current)}</strong> plan
            {onPaidPlan && billing.renewsOrEndsAt ? <> · renews or ends {longDate(billing.renewsOrEndsAt)}</> : null}.
            {billing.hasBillingAccount && (
              <>
                {' '}
                <button type="button" className="link-btn" disabled={busy !== null} onClick={() => go('portal', openBillingPortal)}>
                  {busy === 'portal' ? 'Opening…' : 'Manage billing'}
                </button>
              </>
            )}
          </p>
        )}
      </div>

      {checkout === 'success' && (
        <div className="plans-notice plans-notice-ok" role="status">
          Thanks, your payment went through. Your plan updates as soon as Stripe confirms it (usually a few seconds) and a
          confirmation email is on its way.{' '}
          <button type="button" className="link-btn" onClick={dismiss}>Dismiss</button>
        </div>
      )}
      {checkout === 'cancelled' && (
        <div className="plans-notice plans-notice-warn" role="status">
          Checkout was cancelled and you have not been charged.{' '}
          <button type="button" className="link-btn" onClick={dismiss}>Dismiss</button>
        </div>
      )}
      {billing && !paymentsEnabled && (
        <div className="plans-notice plans-notice-warn">Online payments are being set up. Plan purchases will open shortly.</div>
      )}
      {error && <div className="plans-notice plans-notice-warn" role="alert">{error}</div>}

      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrent = plan.key === current && (plan.key === 'starter' || billing?.planStatus === 'active');
          return (
            <div key={plan.key} className={`plan-card${isCurrent ? ' plan-card-current' : ''}`}>
              <div className="plan-card-top">
                <span className="plan-name">{plan.name}</span>
                {isCurrent && <span className="plan-badge plan-badge-current">Current plan</span>}
                {!isCurrent && plan.popular && <span className="plan-badge plan-badge-popular">Most providers</span>}
              </div>
              <div className="plan-price">
                ${(plan.priceCents / 100).toFixed(0)}
                <span className="plan-price-suffix">/month</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className="plan-tick">✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.key === 'starter' ? (
                <span className="btn btn-primary btn-size-cta plan-cta plan-cta-current" aria-disabled="true" style={{ textAlign: 'center' }}>
                  {isCurrent ? 'Your current plan' : 'Free plan'}
                </span>
              ) : isCurrent ? (
                <button type="button" className="btn btn-primary btn-size-cta plan-cta plan-cta-current" disabled>Your current plan</button>
              ) : onPaidPlan ? (
                <button type="button" className="btn btn-primary btn-size-cta plan-cta" disabled={busy !== null} onClick={() => go('portal', openBillingPortal)}>
                  {busy === 'portal' ? 'Opening…' : `Switch to ${plan.name}`}
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-size-cta plan-cta" disabled={busy !== null || !paymentsEnabled} onClick={() => go(plan.key, () => startCheckout(plan.key))}>
                  {busy === plan.key ? 'Redirecting to Stripe…' : `Choose ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="plans-footnote">
        Payments are handled securely by Stripe, so SolDirectory never sees your card details. You can update your card, download
        invoices, switch plan or cancel any time from “Manage billing”. Unused lead unlocks do not roll over to the next month.
      </p>
    </div>
  );
}
