import mongoose, { Schema, type Document } from 'mongoose';

export interface PlanConfigDoc extends Document {
  key: 'starter' | 'growth' | 'scale';
  name: string;
  priceCents: number;
  quota: number | null; // null = unlimited
  seats?: number;
  features: string[];
  popular?: boolean;
}

const planConfigSchema = new Schema<PlanConfigDoc>({
  key: { type: String, enum: ['starter', 'growth', 'scale'], required: true, unique: true },
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
      key: 'scale',
      name: 'Scale',
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
