import mongoose, { Schema, type Document } from 'mongoose';
import type { LeadMasked, LeadUnlocked } from '@soldirectory/shared-types';

export interface LeadDoc extends Document {
  need: string;
  // Structured support requirements (condition names from the real
  // Condition catalogue) — 'need' stays free text/service name as
  // before, this is additive. Whatever form actually submits leads
  // (not something I have visibility into) would need to start
  // populating this for condition-aware matching to have real data
  // to work with.
  conditions: string[];
  suburb: string;
  distanceKm: number;
  hoursPerWeek: string;
  funding: 'Plan-managed' | 'Self-managed' | 'NDIA-managed';
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
    suburb: String,
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

export const MASKED_PROJECTION = 'need conditions suburb distanceKm hoursPerWeek funding status createdAt';
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
    status: l.status,
    createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
  };
}

export function toUnlockedShape(l: any): LeadUnlocked {
  return { ...toMaskedShape(l), contactName: l.contactName, contactPhone: l.contactPhone, budget: l.budget, note: l.note };
}

export default mongoose.model<LeadDoc>('Lead', leadSchema);
