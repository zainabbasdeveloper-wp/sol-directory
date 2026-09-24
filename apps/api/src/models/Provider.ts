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
  // Spec-requested provider attributes (languages spoken, age groups
  // served) — not collected anywhere in the onboarding wizard UI yet,
  // but settable via onboarding data and, more commonly, by the
  // scraper import script. Free-form string arrays, same convention
  // as registrationGroups/acceptedFunding/conditionExperience above,
  // rather than a fixed enum — mirrors how those already-shipped
  // fields are modeled.
  languages: string[];
  ageGroups: string[];
  intakeEmail: string;
  serviceSuburbs: string[];
  // The provider's own physical/business address — distinct from
  // serviceSuburbs above, which is the list of areas they SERVE, not
  // where they're actually based. Spec-requested structured shape
  // (address/suburb/state/postcode/country) rather than a single
  // free-text string, so each part is independently queryable
  // (e.g. "all providers in NSW") without string parsing.
  businessAddress?: {
    address?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  // Real geo-coordinates — mirrors Worker's location field exactly.
  // Geocoded from businessAddress when present, falling back to the
  // first serviceSuburbs entry otherwise (see onboarding.controller.ts) —
  // this is what makes actual radius search and map display possible.
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
  // WordPress sync (see services/wordpressSync.service.ts). Mongo is
  // the source of truth for provider data and pushes to a mirrored WP
  // "provider" post on every onboarding save — wpPostId links the two
  // records so updates PUT the same post instead of duplicating it.
  // logoUrl is the one field that flows the OTHER way: content admins
  // manage the provider's logo in the WordPress Media Library, and
  // the WP webhook pushes the resulting URL back here.
  wpPostId?: number;
  logoUrl?: string;
  /** The provider uploaded their own logo (see ProviderLogo). Used only when there's no WordPress logo. */
  hasLogoUpload?: boolean;
  // Weekly capacity confirmation (developer brief, Phase 3: "SMS/email
  // every Monday, one-tap confirm. Unconfirmed after 7 days = listing
  // marked paused and dropped from results" — the specific mechanism
  // that makes a "checked, not scraped" claim actually true). Token
  // fields mirror User.passwordResetTokenHash's pattern exactly: a
  // random token is emailed, only its SHA-256 hash is stored, and it's
  // single-use (cleared on confirm). listingPaused is intentionally
  // separate from accountStatus (an admin-only lock) and intakeStatus
  // (the provider's own self-described referral capacity) — this is
  // neither; it's "did they respond to the weekly check-in at all."
  lastCapacityConfirmedAt?: Date;
  listingPaused: boolean;
  // Explicit opt-in to SMS alerts (new enquiries + the weekly capacity
  // prompt). Off by default — see services/sms.service.ts.
  smsNotifications?: boolean;
  // false = created by the scraper/register import for a business that
  // hasn't signed up yet (its owner User has an unusable random password).
  // Flipped to true when the owner proves control of the contact inbox by
  // completing the emailed password-reset link (auth.controller.ts
  // resetPassword). Defaults true so self-registered and pre-existing
  // providers are unaffected.
  claimed?: boolean;
  capacityConfirmTokenHash?: string;
  capacityConfirmExpiresAt?: Date;
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
    languages: [String],
    ageGroups: [String],
    intakeEmail: String,
    serviceSuburbs: [String],
    businessAddress: {
      address: String,
      suburb: String,
      state: String,
      postcode: String,
      country: { type: String, default: 'Australia' },
    },
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
    wpPostId: { type: Number, index: true },
    logoUrl: String,
    hasLogoUpload: { type: Boolean, default: false },
    lastCapacityConfirmedAt: Date,
    listingPaused: { type: Boolean, default: false },
    smsNotifications: { type: Boolean, default: false },
    claimed: { type: Boolean, default: true },
    capacityConfirmTokenHash: { type: String, index: true },
    capacityConfirmExpiresAt: Date,
  },
  { timestamps: true }
);

providerSchema.index({ location: '2dsphere' });

export default mongoose.model<ProviderDoc>('Provider', providerSchema);
