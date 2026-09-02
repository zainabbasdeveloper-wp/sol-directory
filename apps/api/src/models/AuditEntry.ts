import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { insertOnlyPlugin } from '../plugins/insertOnly.plugin.js';

export interface AuditEntryDoc extends Document {
  workerId: Types.ObjectId;
  what: string;
  who: string;
  at: Date;
}

const auditEntrySchema = new Schema<AuditEntryDoc>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
    what: { type: String, required: true },
    who: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

auditEntrySchema.index({ workerId: 1, at: 1 });
auditEntrySchema.plugin(insertOnlyPlugin);

/**
 * The only sanctioned way to add an entry. Derives the new
 * timestamp from the previous entry for this worker so the trail can
 * never go chronologically backwards, then relies on
 * insertOnlyPlugin to make any later attempt to edit it fail.
 */
export async function appendAuditEntry(workerId: Types.ObjectId | string, what: string, who: string) {
  const last = await AuditEntry.findOne({ workerId }).sort({ at: -1 });
  const at = last ? new Date(Math.max(Date.now(), last.at.getTime() + 1000)) : new Date();
  return AuditEntry.create({ workerId, what, who, at });
}

const AuditEntry = mongoose.model<AuditEntryDoc>('AuditEntry', auditEntrySchema);
export default AuditEntry;
