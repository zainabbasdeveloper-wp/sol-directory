import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Real delivery tracking (spec item 26) — every EmailService.sendMail
 * call records one of these, success or failure, so an admin can
 * actually troubleshoot a "did this email go out" question instead
 * of only seeing console.log output on the server.
 */
export interface EmailLogDoc extends Document {
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'skipped_not_configured';
  error?: string;
  createdAt: Date;
}

const schema = new Schema<EmailLogDoc>(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed', 'skipped_not_configured'], required: true },
    error: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<EmailLogDoc>('EmailLog', schema);
