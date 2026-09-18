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
  distanceKm: number;
  hoursPerWeek: string;
  funding?: 'Plan-managed' | 'Self-managed' | 'NDIA-managed';
  contactName: string;
  contactPhone: string;
  budget: string;
  note: string;
  status: 'matched' | 'unlocked' | 'closed';
  createdAt: Date;
}

const leadSchema = new Schema<LeadDoc>(
  {
    need: { type: String, required: true },
    conditions: [String],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
    suburb: String,
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
    status: { type: String, enum: ['matched', 'unlocked', 'closed'], default: 'matched' },
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
