import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import Referral from '../models/Referral.js';

export async function getMyReferrals(req: AuthedRequest, res: Response) {
  // SECURITY: accountStatus filter added — see utils/getActiveProvider.ts
  // for the full context (found during a security audit). Kept as a
  // direct query here rather than the shared helper since this one
  // has a genuine reason to stay lean/projected (only needs
  // referralCode, not the full provider document).
  const provider = await Provider.findOne({ userId: req.user!.id, accountStatus: 'active' }).select('referralCode').lean();
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });

  const referrals = await Referral.find({ referrerProviderId: provider._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    referralCode: provider.referralCode,
    totalReferrals: referrals.length,
    referrals: referrals.map((r: any) => ({ email: r.referredEmail, createdAt: r.createdAt })),
  });
}
