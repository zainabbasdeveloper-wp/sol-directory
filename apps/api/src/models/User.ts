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
  },
  { timestamps: true }
);

export default mongoose.model<UserDoc>('User', userSchema);
