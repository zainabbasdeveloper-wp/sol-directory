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
  lastName: string;
  role: string;
  employer: string;
  yearsExperience: string;
  suburb: string;
  location: { type: 'Point'; coordinates: [number, number] };
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
  email: string;
  phone: string;
  verificationStatus: 'awaiting_review' | 'expiring_soon' | 'approved' | 'rejected';
  published: boolean;
  // Admin-controlled account state — distinct from verificationStatus
  // (which tracks the ONE-TIME approval workflow) and published
  // (which the worker/system toggles for directory visibility).
  // accountStatus is a platform-level lock, same pattern as
  // Provider.accountStatus.
  accountStatus: 'active' | 'suspended';
}

const clearanceSchema = new Schema<ClearanceSub>(
  {
    name: { type: String, required: true },
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
    accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

workerSchema.index({ location: '2dsphere' });
workerSchema.index({ services: 1, suburb: 1, published: 1 });
workerSchema.index({ published: 1, rating: -1 });

export const MASKED_PROJECTION =
  'firstName role employer yearsExperience suburb gender hasCar hourlyRate rating reviewCount services languages conditionExperience availability availableDays availabilityNote bio feedback';

export const UNLOCKED_PROJECTION = `${MASKED_PROJECTION} lastName email phone`;

export function toMaskedShape(w: any): WorkerMasked {
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
