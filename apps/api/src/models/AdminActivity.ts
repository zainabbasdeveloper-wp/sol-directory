import mongoose, { Schema, type Document } from 'mongoose';

// A minimal, real activity log — no such system existed anywhere in
// this app before. Only hooked into mutations I have real, current
// controller code for (provider/worker status changes, shortlist
// adds, onboarding steps). NOT hooked into verification approve/
// reject, since I don't have that controller's current content and
// won't guess at editing it blindly.
export interface AdminActivityDoc extends Document {
  type: string;
  summary: string;
  createdAt: Date;
}

const schema = new Schema<AdminActivityDoc>(
  {
    type: { type: String, required: true },
    summary: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export async function logActivity(type: string, summary: string) {
  try {
    await mongoose.model('AdminActivity').create({ type, summary });
  } catch {
    // Activity logging must never break the real operation it's
    // attached to — a failed log write is swallowed, not thrown.
  }
}

export default mongoose.model<AdminActivityDoc>('AdminActivity', schema);
