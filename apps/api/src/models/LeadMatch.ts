import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * Real audit trail (spec item 19) — records exactly which providers
 * were matched and notified for a lead, with the actual score and
 * breakdown matching.service.ts computed. Before this, matching
 * decided who got emailed but left no queryable record of the
 * decision — an admin could never answer "why did/didn't provider X
 * get this lead" after the fact.
 */
export interface LeadMatchDoc extends Document {
  leadId: Types.ObjectId;
  providerId: Types.ObjectId;
  score: number;
  matchReason: string;
  notifiedAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  status: 'notified' | 'viewed' | 'contacted' | 'declined';
}

const schema = new Schema<LeadMatchDoc>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    score: { type: Number, required: true },
    matchReason: { type: String, required: true },
    notifiedAt: { type: Date, default: Date.now },
    viewedAt: Date,
    respondedAt: Date,
    status: { type: String, enum: ['notified', 'viewed', 'contacted', 'declined'], default: 'notified' },
  },
  { timestamps: false }
);

schema.index({ leadId: 1, providerId: 1 }, { unique: true });

export default mongoose.model<LeadMatchDoc>('LeadMatch', schema);
