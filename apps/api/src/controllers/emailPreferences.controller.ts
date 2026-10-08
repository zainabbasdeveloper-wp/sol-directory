import type { Request, Response } from 'express';
import Lead from '../models/Lead.js';
import RegisterListing from '../models/RegisterListing.js';
import { siteOrigin, verifyToken, type UnsubscribeKind } from '../services/emailTokens.js';

const page = (title: string, message: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#F5F8FC;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#10233F">
<div style="max-width:480px;margin:12vh auto;background:#fff;border:1px solid #E8EEF7;border-radius:12px;padding:32px 28px">
<h1 style="margin:0 0 12px;font-size:20px;color:#0B2D5C">${title}</h1><p style="line-height:1.6;margin:0 0 20px">${message}</p>
<a href="${siteOrigin()}" style="display:inline-block;background:#1769E0;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:8px">Go to SolDirectory</a></div></body></html>`;

/**
 * GET or POST /api/email/unsubscribe?kind=lead|listing&id=...&t=...
 * One click, no login. The link is signed (see emailTokens.ts), so it only works for the address it was sent to. POST is
 * what mail apps use for their own one-click "Unsubscribe" button (List-Unsubscribe-Post).
 */
export async function unsubscribe(req: Request, res: Response) {
  const kind = String(req.query.kind ?? '') as UnsubscribeKind;
  const id = String(req.query.id ?? '');
  const token = String(req.query.t ?? '');

  if ((kind !== 'lead' && kind !== 'listing') || !/^[a-f0-9]{24}$/i.test(id) || !verifyToken(kind, id, token)) {
    return res.status(400).send(page('This link is not valid', 'The unsubscribe link looks incomplete or has been changed. Please use the link from the most recent email, or contact us and we will remove you.'));
  }

  if (kind === 'lead') await Lead.updateOne({ _id: id }, { $set: { emailOptOut: true } });
  else await RegisterListing.updateOne({ _id: id }, { $set: { emailOptOut: true } });

  if (req.method === 'POST') return res.status(200).json({ unsubscribed: true });
  res.send(page(
    'You have been unsubscribed',
    kind === 'lead'
      ? 'We will not send you any more follow-up emails about your request.'
      : 'We will not send this business any more enquiry notices.',
  ));
}
