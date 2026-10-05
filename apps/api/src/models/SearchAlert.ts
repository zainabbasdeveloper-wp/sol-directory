import mongoose, { Schema, type Document } from 'mongoose';

export interface SearchAlertDoc extends Document {
  email: string;
  alertKey: string;
  service?: string;
  suburb?: string;
  query?: string;
  status: 'pending' | 'active' | 'unsubscribed';
  verificationTokenHash?: string;
  unsubscribeTokenHash: string;
  verifiedAt?: Date;
  lastCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SearchAlertDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    alertKey: { type: String, required: true, unique: true, index: true },
    service: String,
    suburb: String,
    query: String,
    status: { type: String, enum: ['pending', 'active', 'unsubscribed'], default: 'pending', index: true },
    verificationTokenHash: { type: String, index: true, sparse: true },
    unsubscribeTokenHash: { type: String, required: true, unique: true, index: true },
    verifiedAt: Date,
    lastCheckedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model<SearchAlertDoc>('SearchAlert', schema);