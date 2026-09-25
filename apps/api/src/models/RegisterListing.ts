import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A provider as it appears on a PUBLIC REGISTER (NDIS Commission or My
 * Aged Care) — deliberately NOT a Provider. A Provider is a business that
 * has an account here, confirms its capacity weekly, and can receive
 * enquiries. A RegisterListing is only "this business is on the public
 * register, and here's what the register says", so:
 *
 *  - it never counts toward "providers accepting enquiries" or appears in
 *    matching — nothing here says the business has capacity;
 *  - it has no User, no email and no contact details (the registers don't
 *    publish them, and we won't invent them);
 *  - the only way it becomes a real Provider is the business asking to
 *    claim it (see ClaimRequest.ts) and us verifying that request.
 */
export interface RegisterArea {
  suburb: string;
  suburbSlug: string;
  state: string;
}

export interface RegisterListingDoc extends Document {
  type: 'ndis' | 'aged_care';
  slug: string;
  name: string;
  nameLower: string;
  states: string[];
  areas: RegisterArea[];
  areaCount: number;
  website?: string;
  /** Display labels for the services the register lists (allowlisted, see registerNormalise.ts). */
  services: string[];
  /** Canonical categories, used for filtering and counts. */
  supportCategories: string[];
  claimStatus: 'unclaimed' | 'requested' | 'claimed';
  /** Set when an admin links a claimed listing to the real Provider account. */
  providerId?: mongoose.Types.ObjectId;
  importedAt: Date;
  sourceUpdatedAt?: Date;
  /**
   * A logo/icon URL found on the business's OWN website (see
   * services/logoDiscovery.ts) — never copied or re-hosted from anywhere
   * else, and never from a competitor's site. This is a link to an image
   * that still lives on the business's own domain; if they take it down
   * the frontend just falls back to initials, same as any other Avatar.
   * A claimed listing's real Provider-uploaded logo always takes
   * priority over this — see register.controller.ts.
   */
  logoUrl?: string;
  /** When logoUrl was last looked up (or last tried and found nothing) — skip re-checking too often. */
  logoCheckedAt?: Date;
}

const areaSchema = new Schema<RegisterArea>(
  { suburb: { type: String, required: true }, suburbSlug: { type: String, required: true }, state: { type: String, required: true } },
  { _id: false }
);

const registerListingSchema = new Schema<RegisterListingDoc>(
  {
    type: { type: String, enum: ['ndis', 'aged_care'], required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    nameLower: { type: String, required: true },
    states: [String],
    areas: [areaSchema],
    areaCount: { type: Number, default: 0 },
    website: String,
    services: [String],
    supportCategories: [String],
    claimStatus: { type: String, enum: ['unclaimed', 'requested', 'claimed'], default: 'unclaimed' },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider' },
    importedAt: { type: Date, default: Date.now },
    sourceUpdatedAt: Date,
    logoUrl: String,
    logoCheckedAt: Date,
  },
  { timestamps: true }
);

registerListingSchema.index({ type: 1, slug: 1 }, { unique: true });
// MongoDB can't index two array fields in one compound index ("cannot index
// parallel arrays"), so states and supportCategories each get their own.
registerListingSchema.index({ type: 1, states: 1 });
registerListingSchema.index({ type: 1, supportCategories: 1 });
registerListingSchema.index({ type: 1, 'areas.state': 1, 'areas.suburbSlug': 1 });
registerListingSchema.index({ type: 1, nameLower: 1 });

export default mongoose.model<RegisterListingDoc>('RegisterListing', registerListingSchema);
