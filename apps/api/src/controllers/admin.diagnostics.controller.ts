import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import EmailLog from '../models/EmailLog.js';

// Backend-only config checks — things a browser can never see
// directly (server env vars), which is exactly why this needs to be
// an API endpoint rather than something the frontend diagnostics
// page checks on its own.
export async function getDiagnostics(req: AuthedRequest, res: Response) {
  res.json({
    geocoding: {
      configured: !!process.env.MAPBOX_ACCESS_TOKEN,
    },
    email: {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    },
    adminNotifications: {
      configured: !!process.env.ADMIN_NOTIFICATION_EMAIL,
    },
  });
}

// Real troubleshooting data (spec item 26) — an admin can see exactly
// which emails failed and why, not just infer it from server console
// output they may not have access to.
export async function getEmailLogs(req: AuthedRequest, res: Response) {
  const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({
    items: logs.map((l: any) => ({
      id: String(l._id),
      to: l.to,
      subject: l.subject,
      status: l.status,
      error: l.error ?? null,
      createdAt: l.createdAt,
    })),
  });
}
