import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * A logo uploaded by the provider themselves. Separate from
 * Provider.logoUrl, which the WordPress webhook owns and overwrites
 * (wordpressSync.service.ts): the public logo is the WordPress one if
 * there is one, otherwise this. Small (the browser resizes to a 512px
 * JPEG), public by design, and kept out of the Provider document so list
 * queries never load image bytes.
 */
export interface ProviderLogoDoc extends Document {
  providerId: Types.ObjectId;
  contentType: 'image/jpeg';
  data: Buffer;
  updatedAt: Date;
}

const schema = new Schema<ProviderLogoDoc>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, unique: true },
    contentType: { type: String, enum: ['image/jpeg'], default: 'image/jpeg' },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export default mongoose.model<ProviderLogoDoc>('ProviderLogo', schema);
