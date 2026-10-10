import mongoose, { Schema, type Document } from 'mongoose';

/**
 * One item found on an official source (an NDIS news article or policy page). We keep the facts needed to run an
 * editorial workflow: where it is, what it is called, when it was published, what topics it touches and where it
 * sits in our own pipeline (brief -> scheduled -> published). We do NOT keep or publish the source's article text:
 * the NDIA licenses its site CC BY-NC and asks that it is not used for commercial traffic, so our posts are original
 * writing that cites and links the official page.
 */
export type SourceUpdateStatus = 'new' | 'brief' | 'scheduled' | 'published' | 'dismissed';

export interface SourceUpdateDoc extends Document {
  source: string;
  url: string;
  title: string;
  categories: string[];
  /** The source's own one-line summary, kept for the admin's eyes only (never published). */
  teaser?: string;
  publishedAt?: Date;
  /** Section headings found on the page, used as a prompt for what the post should cover. */
  headings: string[];
  wordCount: number;
  contentHash: string;
  /** When the page itself (not just the list entry) was last read; empty until a detail read has succeeded. */
  detailAt?: Date;
  topics: string[];
  /** 0-100: how worth writing about this looks. Pure ranking; a person decides. */
  priority: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastChangedAt?: Date;
  changeCount: number;
  /** True when the source changed after we briefed, scheduled or published on it: the post needs re-checking. */
  needsRecheck: boolean;
  status: SourceUpdateStatus;
  wpPostId?: number;
  wpPostUrl?: string;
  briefedAt?: Date;
  scheduledFor?: Date;
  publishedOnAt?: Date;
  dismissedReason?: string;
}

const schema = new Schema<SourceUpdateDoc>({
  source: { type: String, required: true, index: true },
  url: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  categories: { type: [String], default: [] },
  teaser: String,
  publishedAt: { type: Date, index: true },
  headings: { type: [String], default: [] },
  wordCount: { type: Number, default: 0 },
  contentHash: { type: String, required: true },
  detailAt: Date,
  topics: { type: [String], default: [] },
  priority: { type: Number, default: 50, index: true },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  lastChangedAt: Date,
  changeCount: { type: Number, default: 0 },
  needsRecheck: { type: Boolean, default: false },
  status: { type: String, enum: ['new', 'brief', 'scheduled', 'published', 'dismissed'], default: 'new', index: true },
  wpPostId: Number,
  wpPostUrl: String,
  briefedAt: Date,
  scheduledFor: Date,
  publishedOnAt: Date,
  dismissedReason: String,
});

schema.index({ status: 1, priority: -1, publishedAt: -1 });

export default mongoose.model<SourceUpdateDoc>('SourceUpdate', schema);
