import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { Role } from '@soldirectory/shared-types';

export interface UserDoc extends Document {
  name: string;
  email: string;
  mobile?: string;
  passwordHash: string;
  role: Role;
  providerId?: Types.ObjectId;
  workerId?: Types.ObjectId;
  // Coordinators and participants have no separate profile model
  // (unlike Provider/Worker) — accountStatus lives directly on User
  // for them. Provider/Worker keep their own accountStatus fields on
  // their respective models; this one is specifically for roles that
  // have nothing else to attach it to.
  accountStatus: 'active' | 'suspended';
  // Only meaningful for admin — used to compute the notification
  // dropdown's unread count as "activity since this timestamp"
  // rather than maintaining a separate read/unread flag per
  // notification, which would duplicate AdminActivity for no reason.
  lastNotificationsViewedAt?: Date;
  // Real password reset support — the token itself is never stored,
  // only its hash (same principle as passwordHash never storing the
  // plaintext password), so a database read alone can't be used to
  // reset someone's account.
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: String,
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['worker', 'provider', 'coordinator', 'participant', 'admin'], required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider' },
    workerId: { type: Schema.Types.ObjectId, ref: 'Worker' },
    accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastNotificationsViewedAt: Date,
    passwordResetTokenHash: String,
    passwordResetExpiresAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model<UserDoc>('User', userSchema);
