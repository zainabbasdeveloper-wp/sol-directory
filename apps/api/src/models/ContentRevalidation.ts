import mongoose, { Schema, type Document } from 'mongoose';

/**
 * There's no server-side page cache in this architecture to
 * invalidate (the frontend fetches WordPress directly, client-side,
 * with a simple in-memory session cache) — so a traditional
 * "webhook purges the cache" flow doesn't apply. What DOES apply,
 * and is genuinely useful: WordPress tells this API "content
 * changed at time X," and the frontend's cache checks that
 * timestamp before trusting anything it already has cached. This
 * is a real stale-while-revalidate pattern, not a no-op.
 */
export interface ContentRevalidationDoc extends Document {
  lastChangedAt: Date;
}

const schema = new Schema<ContentRevalidationDoc>({
  lastChangedAt: { type: Date, required: true, default: Date.now },
});

export default mongoose.model<ContentRevalidationDoc>('ContentRevalidation', schema);
