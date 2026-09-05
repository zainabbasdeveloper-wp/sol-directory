import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ShortlistDoc extends Document {
  userId: Types.ObjectId;
  providerId: Types.ObjectId;
  createdAt: Date;
}

const shortlistSchema = new Schema<ShortlistDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The actual data-integrity guarantee against duplicates/race
// conditions — a double-click or two near-simultaneous requests
// can't create two rows for the same user+provider pair, enforced
// at the database level, not just in application logic.
shortlistSchema.index({ userId: 1, providerId: 1 }, { unique: true });

export default mongoose.model<ShortlistDoc>('Shortlist', shortlistSchema);
