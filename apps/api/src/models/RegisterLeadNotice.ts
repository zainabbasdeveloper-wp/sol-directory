import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * One row each time a register listing is told about a new enquiry near it. The unique index means a listing is never
 * told about the same enquiry twice, and counting recent rows is how the per-listing frequency cap is enforced.
 */
export interface RegisterLeadNoticeDoc extends Document {
  leadId: Types.ObjectId;
  listingId: Types.ObjectId;
  sentAt: Date;
  delivered: boolean;
}

const schema = new Schema<RegisterLeadNoticeDoc>({
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  listingId: { type: Schema.Types.ObjectId, ref: 'RegisterListing', required: true, index: true },
  sentAt: { type: Date, default: Date.now },
  delivered: { type: Boolean, default: false },
});

schema.index({ leadId: 1, listingId: 1 }, { unique: true });

export default mongoose.model<RegisterLeadNoticeDoc>('RegisterLeadNotice', schema);
