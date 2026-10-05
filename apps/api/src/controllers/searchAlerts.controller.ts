import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import SearchAlert from '../models/SearchAlert.js';
import { EmailService } from '../services/email.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_WINDOW_MS = 15 * 60 * 1000;

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

function siteUrl(req: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const protocol = (req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
  return `${protocol}://${req.get('host')}`;
}

export async function createSearchAlert(req: Request, res: Response) {
  if (req.body?.website_url) return res.status(202).json({ message: 'Check your email to confirm this alert.' });

  const email = clean(req.body?.email, 254).toLowerCase();
  const service = clean(req.body?.service, 120);
  const suburb = clean(req.body?.suburb, 120);
  const query = clean(req.body?.query, 120);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (req.body?.consent !== true) return res.status(400).json({ error: 'Please confirm that you want to receive provider alerts.' });
  if (!service && !suburb && !query) return res.status(400).json({ error: 'Choose at least one search filter before creating an alert.' });

  const alertKey = hash(JSON.stringify({ email, service: service.toLowerCase(), suburb: suburb.toLowerCase(), query: query.toLowerCase() }));
  const existing = await SearchAlert.findOne({ alertKey });
  if (existing?.status === 'active') return res.status(200).json({ message: 'This search alert is already active.' });
  if (existing && Date.now() - existing.updatedAt.getTime() < RESEND_WINDOW_MS) {
    return res.status(202).json({ message: 'Check your email to confirm this alert.' });
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const unsubscribeToken = crypto.randomBytes(32).toString('hex');
  const alert = await SearchAlert.findOneAndUpdate(
    { alertKey },
    {
      $set: {
        email, service: service || undefined, suburb: suburb || undefined, query: query || undefined,
        status: 'pending', verificationTokenHash: hash(verificationToken), unsubscribeTokenHash: hash(unsubscribeToken),
      },
      $unset: { verifiedAt: 1, lastCheckedAt: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const origin = siteUrl(req);
  const delivered = await EmailService.sendSearchAlertVerification(email, {
    service, suburb, query,
    verifyUrl: `${origin}/api/search-alerts/verify?token=${verificationToken}`,
    unsubscribeUrl: `${origin}/api/search-alerts/unsubscribe?token=${unsubscribeToken}`,
  });
  if (!delivered) {
    await SearchAlert.updateOne(
      { _id: alert._id, verificationTokenHash: hash(verificationToken) },
      { $unset: { verificationTokenHash: 1 } },
    );
    return res.status(503).json({ error: 'We couldn’t send the confirmation email. Please try again shortly.' });
  }
  res.status(202).json({ message: 'Check your email to confirm this alert.', id: String(alert._id) });
}

export async function verifySearchAlert(req: Request, res: Response) {
  const token = clean(req.query.token, 128);
  const alert = token ? await SearchAlert.findOneAndUpdate(
    { verificationTokenHash: hash(token), status: 'pending' },
    { $set: { status: 'active', verifiedAt: new Date(), lastCheckedAt: new Date() }, $unset: { verificationTokenHash: 1 } },
    { new: true },
  ) : null;
  const destination = `${siteUrl(req)}/find-a-provider?alert=${alert ? 'verified' : 'invalid'}`;
  res.redirect(303, destination);
}

export async function unsubscribeSearchAlert(req: Request, res: Response) {
  const token = clean(req.query.token, 128);
  const alert = token ? await SearchAlert.findOneAndUpdate(
    { unsubscribeTokenHash: hash(token) },
    { $set: { status: 'unsubscribed' }, $unset: { verificationTokenHash: 1 } },
  ) : null;
  const destination = `${siteUrl(req)}/find-a-provider?alert=${alert ? 'unsubscribed' : 'invalid'}`;
  res.redirect(303, destination);
}