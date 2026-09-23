import mongoose, { Schema, type Document } from 'mongoose';

/**
 * "This is my business" — a request to claim a public-register listing
 * (see RegisterListing.ts). Register listings have no contact details on
 * file, so unlike an imported Provider they can't be claimed by clicking
 * an emailed link. Instead the requester tells us who they are and a
 * person at SolDirectory verifies it (e.g. against the business's own
 * website or ABN) before linking the listing to a real Provider account.
 * Nothing is granted automatically.
 */
export interface ClaimRequestDoc extends Document {
  listingId: mongoose.Types.ObjectId;
  type: 'ndis' | 'aged_care';
  slug: string;
  listingName: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  message?: string;
  status: 'new' | 'verified' | 'rejected';
  createdAt: Date;
}

const claimRequestSchema = new Schema<ClaimRequestDoc>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'RegisterListing', required: true, index: true },
    type: { type: String, enum: ['ndis', 'aged_care'], required: true },
    slug: { type: String, required: true },
    listingName: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: String,
    role: { type: String, required: true },
    message: String,
    status: { type: String, enum: ['new', 'verified', 'rejected'], default: 'new' },
  },
  { timestamps: true }
);

export default mongoose.model<ClaimRequestDoc>('ClaimRequest', claimRequestSchema);
