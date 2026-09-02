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
  rosterSize: number;
  afterHoursCover: string;
  incidentPolicyEscalation: string;
  onboarding: OnboardingStepSub[];

  // Stripe — plan/quota below are written ONLY by
  // services/stripe.service.ts's webhook handler. There is
  // deliberately no controller route that lets an authenticated
  // provider set their own `plan`.
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
