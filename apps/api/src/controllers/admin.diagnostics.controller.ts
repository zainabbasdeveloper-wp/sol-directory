import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';

// Backend-only config checks — things a browser can never see
// directly (server env vars), which is exactly why this needs to be
// an API endpoint rather than something the frontend diagnostics
// page checks on its own.
export async function getDiagnostics(req: AuthedRequest, res: Response) {
  res.json({
    geocoding: {
      configured: !!process.env.GOOGLE_MAPS_API_KEY,
    },
    email: {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    },
    adminNotifications: {
      configured: !!process.env.ADMIN_NOTIFICATION_EMAIL,
    },
  });
}
