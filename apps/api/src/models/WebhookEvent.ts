import mongoose, { Schema, type Document } from 'mongoose';

export interface WebhookEventDoc extends Document {
  stripeEventId: string;
  type: string;
  processedAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventDoc>({
  stripeEventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
});

export default mongoose.model<WebhookEventDoc>('WebhookEvent', webhookEventSchema);
