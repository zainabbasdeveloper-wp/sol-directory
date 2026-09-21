import mongoose, { Schema, type Document } from 'mongoose';
import type { LeadMasked, LeadUnlocked } from '@soldirectory/shared-types';

export interface LeadDoc extends Document {
  need: string;
  // Broad funding category (NDIS/Aged Care/Private/DVA/etc.) — always
  // collected by the real matching-request form. Distinct from
  // `funding` below, which is specifically NDIS plan-management
  // style and only ever collected when this is 'NDIS'. Conflating
  // these was the exact bug found and fixed earlier in this project
  // (Provider.acceptedFunding matches against `funding`, not this).
  fundingType: string;
  requesterEmail: string;
  requesterName: string;
  careFor: string;
  timeframe: string;
  planManagement?: string;
  // Structured support requirements (condition names from the real
  // Condition catalogue) — 'need' stays free text/service name as
  // before, this is additive. Whatever form actually submits leads
  // (not something I have visibility into) would need to start
  // populating this for condition-aware matching to have real data
  // to work with.
  conditions: string[];
  // Real coordinates for the detail page map — geocoded lazily the
  // first time a provider unlocks this lead (see unlockLead), since
  // there's no lead-creation endpoint in this codebase to geocode
  // at submission time.
  location?: { type: 'Point'; coordinates: [number, number] };
  suburb: string;
  // Structured parts of the location the family picked in the wizard's
  // suburb search (state code + postcode). `suburb` above is the bare
  // suburb NAME so it can be compared with Provider.serviceSuburbs.
  state?: string;
  postcode?: string;
  distanceKm: number;
  hoursPerWeek: string;
  funding?: 'Plan-managed' | 'Self-managed' | 'NDIA-managed';
  contactName: string;
  contactPhone: string;
  budget: string;
  note: string;
  // 'draft' is a wizard-in-progress enquiry (developer brief: "Save
  // at every step, not only on submit") — never matched against
  // providers or emailed to anyone. Transitions to 'matched' on real
  // submission (matchRequests.controller.ts), same document, not a
  // second record, so a completed enquiry that started as a draft
  // isn't duplicated.
  status: 'draft' | 'matched' | 'unlocked' | 'closed';
  // TTL — only set while status is 'draft' (cleared on submit), so an
  // abandoned mid-wizard draft is auto-deleted after 30 days instead
  // of accumulating forever, without needing a cron job for cleanup.
  draftExpiresAt?: Date;
  createdAt: Date;
}

const leadSchema = new Schema<LeadDoc>(
  {
    // NOT required at the schema level — a draft can legitimately be
    // saved before the service step is reached. Real validation for a
    // genuine submission happens in matchRequests.controller.ts, which
    // already checks every field explicitly before matching/emailing.
    need: String,
    conditions: [String],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
    suburb: String,
    state: String,
    postcode: String,
    fundingType: String,
    requesterEmail: String,
    requesterName: String,
    careFor: String,
    timeframe: String,
    planManagement: String,
    distanceKm: Number,
    hoursPerWeek: String,
    funding: { type: String, enum: ['Plan-managed', 'Self-managed', 'NDIA-managed'] },
    contactName: String,
    contactPhone: String,
    budget: String,
    note: String,
    status: { type: String, enum: ['draft', 'matched', 'unlocked', 'closed'], default: 'matched' },
    draftExpiresAt: { type: Date, expires: 0 }, // TTL: delete once draftExpiresAt is in the past
  },
  { timestamps: true }
);

// fundingType/careFor/timeframe/planManagement are every wizard field
// that ISN'T personally identifying — same masking philosophy as the
// rest of this projection (category/context info visible before
// unlock, contact-adjacent info like name/phone/note gated behind it).
// These were captured by matchRequests.controller.ts from day one but
// never actually surfaced to providers anywhere in the frontend.
export const MASKED_PROJECTION = 'need conditions suburb distanceKm hoursPerWeek funding fundingType careFor timeframe planManagement status createdAt';
export const UNLOCKED_PROJECTION = `${MASKED_PROJECTION} contactName contactPhone budget note`;

export function toMaskedShape(l: any): LeadMasked {
  return {
    id: String(l._id),
    need: l.need,
    conditions: l.conditions ?? [],
    suburb: l.suburb,
    distanceKm: l.distanceKm,
    hoursPerWeek: l.hoursPerWeek,
    funding: l.funding,
    fundingType: l.fundingType,
    careFor: l.careFor,
    timeframe: l.timeframe,
    planManagement: l.planManagement,
    status: l.status,
    createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
  };
}

export function toUnlockedShape(l: any): LeadUnlocked {
  return {
    ...toMaskedShape(l),
    contactName: l.contactName,
    contactPhone: l.contactPhone,
    budget: l.budget,
    note: l.note,
    location: l.location?.coordinates ? { lat: l.location.coordinates[1], lng: l.location.coordinates[0] } : null,
  };
}

export default mongoose.model<LeadDoc>('Lead', leadSchema);
