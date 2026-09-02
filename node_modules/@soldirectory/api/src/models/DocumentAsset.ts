import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface DocumentAssetDoc extends Document {
  ownerId: Types.ObjectId; // Worker or Provider
  ownerType: 'Worker' | 'Provider';
  kind: string; // 'ndis_worker_check' | 'police_check' | 'insurance_pl' | 'incident_policy' | ...
  contentType: string;
  s3Key: string;
  originalFilename: string;
  uploadedAt: Date;
}

const documentAssetSchema = new Schema<DocumentAssetDoc>({
  ownerId: { type: Schema.Types.ObjectId, required: true, refPath: 'ownerType' },
  ownerType: { type: String, enum: ['Worker', 'Provider'], required: true },
  kind: { type: String, required: true },
  contentType: { type: String, required: true },
  s3Key: { type: String, required: true },
  originalFilename: String,
  uploadedAt: { type: Date, default: Date.now },
});

documentAssetSchema.index({ ownerId: 1, kind: 1 });

export default mongoose.model<DocumentAssetDoc>('DocumentAsset', documentAssetSchema);
