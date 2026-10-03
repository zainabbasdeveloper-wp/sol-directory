import mongoose, { Schema, type Document } from 'mongoose';

export interface PlanConfigDoc extends Document {
  key: 'starter' | 'growth' | 'pro';
  name: string;
  priceCents: number;
  quota: number | null; // null = unlimited
  seats?: number;
  features: string[];
  popular?: boolean;
}

const planConfigSchema = new Schema<PlanConfigDoc>({
  key: { type: String, enum: ['starter', 'growth', 'pro'], required: true, unique: true },
  name: { type: String, required: true },
  priceCents: { type: Number, required: true },
  quota: { type: Number, default: null }, // null stored, not Infinity — Mongo can't store Infinity
  seats: Number,
  features: [String],
  popular: Boolean,
});

const PlanConfig = mongoose.model<PlanConfigDoc>('PlanConfig', planConfigSchema);

/**
 * Seeds the two provisional values from the design handoff README —
 * pricing ($0/$249/$649) and quota (0/15/unlimited) — as DB rows an
 * admin can edit later, rather than a hardcoded constants file.
 * Idempotent: safe to call on every server start.
 */
export async function ensureDefaultPlans(): Promise<void> {
  // Provider.plan calls the top tier 'pro'; this collection used to seed it as
  // 'scale' (see scripts/migratePlanConfigScaleToPro.ts). Rename a leftover
  // 'scale' row in place — keeping whatever price/quota an admin set — so the
  // upsert below doesn't create a second top tier.
  const legacy = await PlanConfig.collection.findOne({ key: 'scale' });
  if (legacy && !(await PlanConfig.collection.findOne({ key: 'pro' }))) {
    await PlanConfig.collection.updateOne({ key: 'scale' }, { $set: { key: 'pro' } });
  }

  const defaults: Omit<PlanConfigDoc, keyof Document>[] = [
    {
      key: 'starter',
      name: 'Starter',
      priceCents: 0,
      quota: 0,
      features: ['Public provider listing', 'Search the worker directory', 'Contact requests to workers', 'Lead headlines, no contact details'],
    },
    {
      key: 'growth',
      name: 'Growth',
      priceCents: 24900,
      quota: 15,
      seats: 3,
      popular: true,
      features: ['15 lead unlocks per month', 'Full brief, budget and contact details', 'Matched to your service areas', 'Three team seats', 'Response time reporting'],
    },
    {
      key: 'pro',
      name: 'Pro',
      priceCents: 64900,
      quota: null,
      seats: 10,
      features: ['Unlimited lead unlocks', 'Priority placement in participant search', 'CSV export and webhook feed', 'Ten team seats', 'Named account manager'],
    },
  ];

  for (const plan of defaults) {
    await PlanConfig.updateOne({ key: plan.key }, { $setOnInsert: plan }, { upsert: true });
  }
}

export default PlanConfig;
