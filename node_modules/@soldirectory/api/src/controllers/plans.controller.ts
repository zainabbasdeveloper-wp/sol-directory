import type { Request, Response } from 'express';
import PlanConfig from '../models/PlanConfig.js';

export async function getPlans(req: Request, res: Response) {
  const plans = await PlanConfig.find({}).lean();
  res.json(plans);
}

// Deliberately no switchPlan() here. Per the spec, plan changes are
// initiated through Stripe Checkout/Billing Portal on the client,
// and only take effect once the resulting webhook is processed by
// services/stripe.service.ts. See routes/webhooks.routes.ts.
