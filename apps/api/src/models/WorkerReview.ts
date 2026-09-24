import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * A review of an independent worker, written by a provider organisation that
 * contacted the worker through SolDirectory (there is a ContactRequest from
 * the reviewer to the worker — see workersReviews.controller.ts).
 *
 * Nothing is shown publicly until an admin approves it. Only approved
 * reviews count toward a worker's rating (recomputeWorkerRating). One review
 * per reviewer per worker: editing it sends it back to moderation.
 */
export interface WorkerReviewDoc extends Document {
  workerId: Types.ObjectId;
  reviewerUserId: Types.ObjectId;
  /** The reviewer's business name, captured when they wrote it. */
  reviewerName: string;
  rating: number;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  /** Why it was rejected, for the admin's own record (never shown publicly). */
  moderationNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WorkerReviewDoc>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
    reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    moderationNote: String,
  },
  { timestamps: true }
);

schema.index({ workerId: 1, reviewerUserId: 1 }, { unique: true });
schema.index({ workerId: 1, status: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: 1 });

export default mongoose.model<WorkerReviewDoc>('WorkerReview', schema);
