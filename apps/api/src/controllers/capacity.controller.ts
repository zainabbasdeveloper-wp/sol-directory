import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import { getActiveProviderForUser } from '../utils/getActiveProvider.js';

function confirm(provider: any) {
  provider.lastCapacityConfirmedAt = new Date();
  provider.listingPaused = false;
  provider.capacityConfirmTokenHash = undefined;
  provider.capacityConfirmExpiresAt = undefined;
}

/**
 * Public, token-based — the "one-tap confirm" link sent by the weekly
 * capacity job (jobs/weeklyCapacityCheck.ts). No login required, same
 * principle as auth.controller.ts's password reset: the token itself
 * is the credential, hashed at rest, single-use, time-limited.
 */
export async function confirmCapacityByToken(req: Request, res: Response) {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: 'A token is required.' });

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const provider = await Provider.findOne({ capacityConfirmTokenHash: tokenHash });

  if (!provider || !provider.capacityConfirmExpiresAt || provider.capacityConfirmExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'This confirmation link is invalid or has expired.' });
  }

  confirm(provider);
  await provider.save();

  res.json({ confirmed: true, providerName: provider.tradingName || provider.legalEntityName });
}

/**
 * Authenticated — opt in/out of SMS alerts. Explicit and reversible: SMS
 * is never on by default (services/sms.service.ts).
 */
export async function setSmsPreference(req: AuthedRequest, res: Response) {
  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });

  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });

  provider.smsNotifications = enabled;
  await provider.save();
  res.json({ smsNotifications: provider.smsNotifications });
}

/**
 * Authenticated — the dashboard's own "Confirm now" button, for a
 * provider who's already logged in rather than clicking an email
 * link. Same effect as confirmCapacityByToken, no token needed since
 * the session already proves who they are.
 */
export async function confirmCapacityNow(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });

  confirm(provider);
  await provider.save();

  res.json({
    confirmed: true,
    lastCapacityConfirmedAt: provider.lastCapacityConfirmedAt,
    listingPaused: provider.listingPaused,
  });
}
