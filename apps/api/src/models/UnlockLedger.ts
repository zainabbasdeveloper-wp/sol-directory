import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface UnlockLedgerDoc extends Document {
  providerId: Types.ObjectId;
  leadId: Types.ObjectId;
  idempotencyKey: string;
  createdAt: Date;
}

const unlockLedgerSchema = new Schema<UnlockLedgerDoc>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The real gate against double-unlocking: even two different
// idempotency keys can't create two ledger rows for the same
// (provider, lead) pair.
unlockLedgerSchema.index({ providerId: 1, leadId: 1 }, { unique: true });

export default mongoose.model<UnlockLedgerDoc>('UnlockLedger', unlockLedgerSchema);
