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
 *  - it has no User/login of its own. It may have a phone number and/or a
 *    discovered email (see below) — real, published contact facts about
 *    the business, not invented — but neither one makes it a Provider;
 *  - the only way it becomes a real Provider is the business asking to
 *    claim it (see ClaimRequest.ts) and us verifying that request, or an
 *    admin provisioning one directly.
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
  /** The business's own published phone number — a real fact, never invented. Admin-visible only: the public API never returns it (register.controller.ts) — enquiries go through the matching flow instead. */
  phone?: string;
  /** Set when phoneDiscovery.ts has looked for one on the business's own website (whether or not it found one) — only relevant for listings the original register import had no phone for; skip re-checking too often. */
  phoneCheckedAt?: Date;
  /**
   * A contact email found on the business's own website (see
   * services/emailDiscovery.ts) or cross-checked against it during an
   * import (see scripts/mergeNdisLeadsContact.ts) — never guessed, never
   * taken from anyone else's site. Admin-visible only, same as phone.
   */
  email?: string;
  emailCheckedAt?: Date;
  /**
   * True only when phone/email were corroborated against an independent
   * signal — currently: the email's domain matches this listing's own
   * website domain. Not currently used to gate anything public (phone/
   * email aren't returned by the public API regardless), but kept as a
   * confidence signal for admin use — e.g. worth calling to invite a
   * claim vs. a number that might be stale.
   */
  contactVerified?: boolean;
  /** Australian Business Number, digits only — a real, publicly-issued identifier, not scraped prose. Used to cross-reference a listing against other official sources; shown publicly since an ABN carries no privacy concern of its own. */
  abn?: string;
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
  /**
   * The wp-admin 'register_listing' post mirroring this record (see
   * services/registerWordpressSync.service.ts) — a separate post type from
   * 'provider', so an imported/unclaimed listing is never mixed into the
   * same wp-admin list as a real, matching-eligible Provider. Set once on
   * first sync so re-syncs PUT the same post instead of duplicating it.
   */
  wpPostId?: number;
  /**
   * Languages the business's OWN website says it supports (see services/languageDiscovery.ts) — only
   * explicit statements such as "we speak Arabic", never a translation menu or a stray mention. Canonical
   * names from the language topic list. Shown publicly as "mentions", never as a verified claim.
   */
  languages?: string[];
  /** When the website was last read for languages (whether or not any were found) — skip re-checking too often. */
  languagesCheckedAt?: Date;
  /** The business asked not to receive enquiry notices (or someone did on its behalf through the unsubscribe link). Respected permanently. */
  emailOptOut?: boolean;
}

const areaSchema = new Schema<RegisterArea>(
  { suburb: { type: String, required: true }, suburbSlug: { type: String, required: true }, state: { type: String, required: true } },
  { _id: false }
);

const registerListingSchema = new Schema<RegisterListingDoc>(
  {
    type: { type: String, enum: ['ndis', 'aged_care'], required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true, maxlength: 160 },
    nameLower: { type: String, required: true },
    states: [String],
    areas: [areaSchema],
    areaCount: { type: Number, default: 0 },
    website: String,
    phone: String,
    phoneCheckedAt: Date,
    email: String,
    emailCheckedAt: Date,
    contactVerified: { type: Boolean, default: false },
    abn: String,
    services: [String],
    supportCategories: [String],
    claimStatus: { type: String, enum: ['unclaimed', 'requested', 'claimed'], default: 'unclaimed' },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider' },
    importedAt: { type: Date, default: Date.now },
    sourceUpdatedAt: Date,
    logoUrl: String,
    logoCheckedAt: Date,
    wpPostId: Number,
    languages: [String],
    languagesCheckedAt: Date,
    emailOptOut: { type: Boolean, default: false },
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
registerListingSchema.index({ type: 1, languages: 1 });

export default mongoose.model<RegisterListingDoc>('RegisterListing', registerListingSchema);
