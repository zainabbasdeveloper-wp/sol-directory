import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * A worker's public profile photo. Kept in its own collection (not on the
 * Worker document) so listing queries never drag image bytes along.
 * Photos are small (the browser crops and resizes to a 480px JPEG before
 * upload) and public by design; sensitive documents never go here — see
 * s3.service.ts for those.
 */
export interface WorkerPhotoDoc extends Document {
  workerId: Types.ObjectId;
  contentType: 'image/jpeg';
  data: Buffer;
  updatedAt: Date;
}

const schema = new Schema<WorkerPhotoDoc>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true, unique: true },
    contentType: { type: String, enum: ['image/jpeg'], default: 'image/jpeg' },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

/** .lean() hands back a BSON Binary, not a Buffer — sending that as-is would serialise it to JSON. */
export const photoBytes = (data: unknown): Buffer => Buffer.from(((data as { buffer?: Uint8Array })?.buffer ?? data) as Uint8Array);

export default mongoose.model<WorkerPhotoDoc>('WorkerPhoto', schema);
