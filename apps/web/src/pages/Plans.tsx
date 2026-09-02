import { useEffect, useState } from 'react';
import { getPlans } from '../api/resources';
import type { PlanConfig } from '@soldirectory/shared-types';
import './Plans.css';

export default function Plans() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="plans-page">Loading…</div>;

  return (
    <div className="plans-page">
      <div className="plans-header">
        <h1 className="page-title">Plans and billing</h1>
      </div>

      <div className="plans-notice plans-notice-ok">
        Plan changes now go through Stripe Checkout/Billing Portal — the
        button below opens that flow. Your plan only actually changes once
        Stripe's webhook confirms it; this page never sets your plan
        directly.
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.key} className="plan-card">
            <div className="plan-card-top">
              <span className="plan-name">{plan.name}</span>
              {plan.popular && <span className="plan-badge plan-badge-popular">Most providers</span>}
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
            <a
              className="btn btn-primary btn-size-cta plan-cta"
              href={`#stripe-checkout-${plan.key}`}
              style={{ textDecoration: 'none' }}
            >
              Manage in Stripe →
            </a>
          </div>
        ))}
      </div>

      <p className="plans-footnote">
        Pricing and lead quotas are configured server-side (see
        <code> PlanConfig</code> in the API) and can change without a
        redeploy.
      </p>
    </div>
  );
}
