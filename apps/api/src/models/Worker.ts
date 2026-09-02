import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { WorkerMasked, WorkerUnlocked, ClearanceStatus } from '@soldirectory/shared-types';

interface ClearanceSub {
  name: string;
  issuingBody?: string;
  referenceNumber?: string;
  expiry?: Date | null;
  status: ClearanceStatus;
}

interface FeedbackSub {
  text: string;
  by: string;
  createdAt: Date;
}

export interface WorkerDoc extends Document {
  userId: Types.ObjectId;
  firstName: string;
  lastName: string; // MASKED FIELD — see projections below
  role: string;
  employer: string;
  yearsExperience: string;
  suburb: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  gender: string;
  hasCar: boolean;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  services: string[];
  languages: string[];
  conditionExperience: string[];
  clearances: ClearanceSub[];
  availability: string[];
  availableDays: string[];
  availabilityNote: string;
  bio: string;
  feedback: FeedbackSub[];
  email: string; // MASKED FIELD
  phone: string; // MASKED FIELD
  verificationStatus: 'awaiting_review' | 'expiring_soon' | 'approved' | 'rejected';
  published: boolean;
}

const clearanceSchema = new Schema<ClearanceSub>(
  {
    name: { type: String, required: true }, // "NDIS Worker Check" — do not rename, statutory term
    issuingBody: String,
    referenceNumber: String,
    expiry: Date,
    status: { type: String, enum: ['verified', 'flagged', 'unmarked'], default: 'unmarked' },
  },
  { _id: false }
);

const feedbackSchema = new Schema<FeedbackSub>(
  { text: String, by: String, createdAt: { type: Date, default: Date.now } },
  { _id: false }
);

const workerSchema = new Schema<WorkerDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: String,
    employer: { type: String, default: 'Independent' },
    yearsExperience: String,
    suburb: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    gender: String,
    hasCar: Boolean,
    hourlyRate: Number,
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    services: [String],
    languages: [String],
    conditionExperience: [String],
    clearances: [clearanceSchema],
    availability: [String],
    availableDays: [String],
    availabilityNote: String,
    bio: String,
    feedback: [feedbackSchema],
    email: String,
    phone: String,
    verificationStatus: {
      type: String,
      enum: ['awaiting_review', 'expiring_soon', 'approved', 'rejected'],
      default: 'awaiting_review',
    },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Geospatial index for radius search (`$near` / `$geoWithin`).
workerSchema.index({ location: '2dsphere' });

// Compound index covering the most common equality-filter
// combination in the directory search (service + suburb + published)
// so those queries hit an index instead of a collection scan.
workerSchema.index({ services: 1, suburb: 1, published: 1 });
workerSchema.index({ published: 1, rating: -1 }); // supports "highest rated" sort

/**
 * PRIVACY (server-side, enforced at the query layer): pass this to
 * `.select()` for any directory/search response. lastName, email and
 * phone are excluded from the query itself — Mongo never sends them
 * over the wire to this process, so there's no risk of an
 * after-the-fact serialization bug leaking them.
 */
export const MASKED_PROJECTION =
  'firstName role employer yearsExperience suburb gender hasCar hourlyRate rating reviewCount services languages conditionExperience availability availableDays availabilityNote bio feedback';

/** Use only after confirming an accepted contact request for this requester. */
export const UNLOCKED_PROJECTION = `${MASKED_PROJECTION} lastName email phone`;

export function toMaskedShape(w: Pick<WorkerDoc, '_id' | keyof Omit<WorkerDoc, '_id'>> | any): WorkerMasked {
  return {
    id: String(w._id),
    firstName: w.firstName,
    lastInitial: w.lastName ? w.lastName[0] : '',
    role: w.role,
    employer: w.employer,
    yearsExperience: w.yearsExperience,
    suburb: w.suburb,
    gender: w.gender,
    hasCar: w.hasCar,
    hourlyRate: w.hourlyRate,
    rating: w.rating,
    reviewCount: w.reviewCount,
    services: w.services ?? [],
    languages: w.languages ?? [],
    conditionExperience: w.conditionExperience ?? [],
    availability: w.availability ?? [],
    availableDays: w.availableDays ?? [],
    availabilityNote: w.availabilityNote,
    bio: w.bio,
    feedback: (w.feedback ?? []).map((f: FeedbackSub) => ({ text: f.text, by: f.by })),
  };
}

export function toUnlockedShape(w: any): WorkerUnlocked {
  return { ...toMaskedShape(w), lastName: w.lastName, email: w.email, phone: w.phone };
}

export default mongoose.model<WorkerDoc>('Worker', workerSchema);
