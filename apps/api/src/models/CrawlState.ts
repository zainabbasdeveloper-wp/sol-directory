import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Small per-site memory for the official-source crawler. When a site refuses automated requests (HTTP 403, 429 or
 * 503) we note it here and stay away until `blockedUntil`, so a cron run or an admin click never keeps knocking on a
 * door that has been closed. We do not try to get round such a refusal.
 */
export interface CrawlStateDoc extends Document {
  origin: string;
  blockedUntil?: Date;
  reason?: string;
  updatedAt: Date;
}

const schema = new Schema<CrawlStateDoc>({
  origin: { type: String, required: true, unique: true },
  blockedUntil: Date,
  reason: String,
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<CrawlStateDoc>('CrawlState', schema);
