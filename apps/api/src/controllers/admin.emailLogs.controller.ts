import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import EmailLog from '../models/EmailLog.js';

export async function listEmailLogs(req: AuthedRequest, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;

  const limit = Math.min(100, Number(req.query.limit) || 50);
  const logs = await EmailLog.find(filter).sort({ sentAt: -1 }).limit(limit).lean();

  res.json({
    items: logs.map((l: any) => ({
      id: String(l._id), to: l.to, template: l.template, subject: l.subject,
      status: l.status, error: l.error ?? null, sentAt: l.sentAt,
    })),
  });
}
