import mongoose, { Schema, type Document } from 'mongoose';

/**
 * One row each time a scheduled job (the cron scripts) runs. The admin dashboard reads these to show whether each job
 * ran on time, how long it took and what it did — so a silently-broken cron line is visible instead of unnoticed.
 */
export interface JobRunDoc extends Document {
  name: string;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  status: 'running' | 'ok' | 'failed';
  /** One line describing what the run did, e.g. "Sent 12 weekly emails". */
  summary?: string;
  error?: string;
}

const schema = new Schema<JobRunDoc>({
  name: { type: String, required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  durationMs: Number,
  status: { type: String, enum: ['running', 'ok', 'failed'], default: 'running' },
  summary: String,
  error: String,
});

schema.index({ name: 1, startedAt: -1 });
// Keep roughly 90 days of history; the dashboard only needs the recent runs.
schema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<JobRunDoc>('JobRun', schema);
