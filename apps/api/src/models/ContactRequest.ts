import mongoose, { Schema, type Document, type Types } from 'mongoose';

// The real model both workers.controller.ts's requestContact and
// providers.controller.ts's requestProviderContact had a TODO
// pointing at — "create a ContactRequest document" — but neither
// ever actually did. This is that model, finally.
export interface ContactRequestDoc extends Document {
  requesterId: Types.ObjectId;
  targetType: 'Provider' | 'Worker';
  targetId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

const schema = new Schema<ContactRequestDoc>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Provider', 'Worker'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ContactRequestDoc>('ContactRequest', schema);
