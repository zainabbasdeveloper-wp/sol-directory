import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ReferralDoc extends Document {
  referrerProviderId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  referredEmail: string;
  createdAt: Date;
}

const schema = new Schema<ReferralDoc>(
  {
    referrerProviderId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredEmail: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ReferralDoc>('Referral', schema);
