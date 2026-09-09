import mongoose, { Schema, type Document } from 'mongoose';

// The canonical service catalogue — replaces the hardcoded arrays
// scattered across WorkerDirectory.tsx (SUPPORT_TYPES), Onboarding.tsx
// (REGISTRATION_GROUP_OPTIONS), and seedAdminDemo.ts, all of which
// listed roughly the same services independently. Adding a service
// here is meant to be the only place that needs to happen.
export interface ServiceDoc extends Document {
  name: string;
  category: string;
  description?: string;
  active: boolean;
  // Funding types this service can be delivered under (NDIS,
  // Aged Care, Private, etc.) — matches the funding values already
  // used elsewhere in this app (Lead.funding, provider onboarding).
  applicableFunding: string[];
  // Which offering roles can select this service for themselves.
  // Participants consume services rather than offer them, so they're
  // deliberately not part of this list — their side is "requirements",
  // which the condition/disability system (next pass) attaches to.
  applicableRoles: ('provider' | 'worker')[];
  // Placeholder for the condition/disability linkage — kept as plain
  // strings for now since the real Condition model doesn't exist yet.
  // The next pass replaces this with real Condition references
  // without needing to touch every service record's shape again,
  // since this field already holds the right kind of data.
  conditionTags: string[];
}

const serviceSchema = new Schema<ServiceDoc>(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: true, index: true },
    description: String,
    active: { type: Boolean, default: true },
    applicableFunding: [String],
    applicableRoles: [{ type: String, enum: ['provider', 'worker'] }],
    conditionTags: [String],
  },
  { timestamps: true }
);

export default mongoose.model<ServiceDoc>('Service', serviceSchema);
