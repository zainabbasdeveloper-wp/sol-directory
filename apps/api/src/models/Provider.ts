import mongoose, { Schema, type Document, type Types } from 'mongoose';

interface OnboardingStepSub {
  key: string;
  complete: boolean;
  data?: Record<string, unknown>;
}

interface PlanHistoryEntry {
  plan: string;
  planStatus: string;
  changedAt: Date;
  changedBy: 'admin' | 'system';
}

export interface ProviderDoc extends Document {
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  legalEntityName: string;
  // Public URL identifier (/providers/{slug}) — never the raw Mongo
  // _id in a public-facing URL. Generated from tradingName at
  // creation time, see providers.controller.ts's slugify().
  slug: string;
  abn: string;
  tradingName: string;
  registrationGroups: string[];
  // Needed for matching (funding compatibility, condition
  // compatibility). IMPORTANT: values here must be drawn from the
  // same domain as Lead.funding ('Plan-managed' | 'Self-managed' |
  // 'NDIA-managed') — that's NDIS plan-management style, not funding
  // scheme (NDIS/Aged Care/Private), which Lead doesn't model.
  // Populating this with scheme-type values would silently make
  // scoreMatch's funding comparison always score 0.
  acceptedFunding: string[];
  conditionExperience: string[];
  intakeEmail: string;
  serviceSuburbs: string[];
  // Real geo-coordinates — mirrors Worker's location field exactly.
  // serviceSuburbs above are just name strings; this is what makes
  // actual radius search and map display possible, populated via
  // Google Maps geocoding (see services/geocoding.service.ts).
  location?: { type: 'Point'; coordinates: [number, number] };
  travelRadiusKm: number;
  weeklyCapacityHours: number;
  intakeStatus: 'Open to referrals' | 'Limited capacity' | 'Waitlist only' | 'Closed';
  // Admin-controlled account state — distinct from intakeStatus
  // above, which the provider sets themselves to describe their own
  // referral capacity. accountStatus is a platform-level lock.
  accountStatus: 'active' | 'suspended';
  rosterSize: number;
  afterHoursCover: string;
  incidentPolicyEscalation: string;
  onboarding: OnboardingStepSub[];
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: 'starter' | 'growth' | 'pro';
  // Distinct from accountStatus (a platform-level account lock) —
  // this is specifically the subscription/plan lifecycle state, per
  // the admin Member Plans requirement. A provider's account can be
  // active while their plan has expired, or vice versa.
  planStatus: 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended';
  planStartedAt: Date;
  planExpiresAt?: Date;
  planHistory: PlanHistoryEntry[];
  // Unique per-provider code for the "refer a friend" feature —
  // shared as a link, checked at signup.
  referralCode: string;
  leadUnlocksUsedThisPeriod: number;
  periodResetsAt?: Date;
}

const onboardingStepSchema = new Schema<OnboardingStepSub>(
  { key: { type: String, required: true }, complete: { type: Boolean, default: false }, data: Schema.Types.Mixed },
  { _id: false }
);

const planHistorySchema = new Schema<PlanHistoryEntry>(
  {
    plan: { type: String, required: true },
    planStatus: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, enum: ['admin', 'system'], default: 'admin' },
  },
  { _id: false }
);

const providerSchema = new Schema<ProviderDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    legalEntityName: String,
    slug: { type: String, unique: true, sparse: true, index: true },
    abn: {
      type: String,
      validate: { validator: (v: string) => /^\d{11}$/.test(v.replace(/\D/g, '')), message: 'ABN must be 11 digits' },
    },
    tradingName: String,
    registrationGroups: [String],
    acceptedFunding: [String],
    conditionExperience: [String],
    intakeEmail: String,
    serviceSuburbs: [String],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    travelRadiusKm: Number,
    weeklyCapacityHours: Number,
    intakeStatus: { type: String, enum: ['Open to referrals', 'Limited capacity', 'Waitlist only', 'Closed'], default: 'Open to referrals' },
    accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
    rosterSize: Number,
    afterHoursCover: String,
    incidentPolicyEscalation: String,
    onboarding: [onboardingStepSchema],
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: String,
    plan: { type: String, enum: ['starter', 'growth', 'pro'], default: 'starter' },
    planStatus: { type: String, enum: ['active', 'trial', 'expired', 'cancelled', 'suspended'], default: 'trial' },
    planStartedAt: { type: Date, default: Date.now },
    planExpiresAt: Date,
    planHistory: [planHistorySchema],
    referralCode: { type: String, unique: true, sparse: true, index: true },
    leadUnlocksUsedThisPeriod: { type: Number, default: 0 },
    periodResetsAt: Date,
  },
  { timestamps: true }
);

providerSchema.index({ location: '2dsphere' });

export default mongoose.model<ProviderDoc>('Provider', providerSchema);
