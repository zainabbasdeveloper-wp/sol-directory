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
  },
  { timestamps: true }
);

export default mongoose.model<UserDoc>('User', userSchema);
