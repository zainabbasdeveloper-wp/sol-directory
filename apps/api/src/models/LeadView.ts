import mongoose, { Schema, type Document, type Types } from 'mongoose';

// Same pattern as ProviderView — one document per meaningful view
// event. A unique index on (leadId, providerId) means opening the
// same lead twice doesn't create duplicate rows (upsert, not
// insert), which is what "avoid thousands of duplicate records from
// repeated renders" actually requires — this isn't about debouncing
// the frontend, it's a real database guarantee.
export interface LeadViewDoc extends Document {
  leadId: Types.ObjectId;
  providerId: Types.ObjectId;
  firstViewedAt: Date;
  lastViewedAt: Date;
}

const schema = new Schema<LeadViewDoc>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    firstViewedAt: { type: Date, default: Date.now },
    lastViewedAt: { type: Date, default: Date.now },
  }
);

schema.index({ leadId: 1, providerId: 1 }, { unique: true });

export default mongoose.model<LeadViewDoc>('LeadView', schema);
