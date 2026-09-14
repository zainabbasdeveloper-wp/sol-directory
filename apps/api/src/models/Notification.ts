import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface NotificationDoc extends Document {
  userId: Types.ObjectId;
  type: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

const schema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<NotificationDoc>('Notification', schema);
