import mongoose, { Schema, type Document, type Types } from 'mongoose';

interface OnboardingStepSub {
  key: string;
  complete: boolean;
  data?: Record<string, unknown>;
}

export interface ProviderDoc extends Document {
  userId: Types.ObjectId;
  legalEntityName: string;
  abn: string;
  tradingName: string;
  registrationGroups: string[];
  intakeEmail: string;
  serviceSuburbs: string[];
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
  plan: 'starter' | 'growth' | 'scale';
  leadUnlocksUsedThisPeriod: number;
  periodResetsAt?: Date;
}

const onboardingStepSchema = new Schema<OnboardingStepSub>(
  { key: { type: String, required: true }, complete: { type: Boolean, default: false }, data: Schema.Types.Mixed },
  { _id: false }
);

const providerSchema = new Schema<ProviderDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    legalEntityName: String,
    abn: {
      type: String,
      validate: { validator: (v: string) => /^\d{11}$/.test(v.replace(/\D/g, '')), message: 'ABN must be 11 digits' },
    },
    tradingName: String,
    registrationGroups: [String],
    intakeEmail: String,
    serviceSuburbs: [String],
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
    plan: { type: String, enum: ['starter', 'growth', 'scale'], default: 'starter' },
    leadUnlocksUsedThisPeriod: { type: Number, default: 0 },
    periodResetsAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model<ProviderDoc>('Provider', providerSchema);
