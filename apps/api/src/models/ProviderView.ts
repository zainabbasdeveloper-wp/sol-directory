import mongoose, { Schema, type Document, type Types } from 'mongoose';

// Real view tracking — nothing like this existed before. Each
// document is one profile-view event; aggregating counts per
// provider is how "most viewed providers" gets computed honestly,
// rather than inventing a number.
export interface ProviderViewDoc extends Document {
  providerId: Types.ObjectId;
  viewerId?: Types.ObjectId;
  createdAt: Date;
}

const schema = new Schema<ProviderViewDoc>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    viewerId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ProviderViewDoc>('ProviderView', schema);
