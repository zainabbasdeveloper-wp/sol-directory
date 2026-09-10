import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import { scoreMatch, MATCH_WEIGHTS } from '../services/matching.service.js';

// Admin-scoped rather than participant-scoped: Lead has no field
// tying it to the participant who submitted it in this schema, so
// there's no established ownership check to build a participant-
// facing version of this yet. This is real functionality either
// way — it just answers "who's the best match for lead X" from the
// admin/oversight side rather than the requester side for now.
export async function getLeadMatches(req: AuthedRequest, res: Response) {
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const providers = await Provider.find({ accountStatus: 'active' }).lean();

  const ranked = providers
    .map((p: any) => ({
      ...scoreMatch(lead as any, p as any),
      providerName: p.tradingName || p.legalEntityName || 'Unnamed provider',
    }))
    .sort((a, b) => b.score - a.score);

  res.json({
    weights: MATCH_WEIGHTS,
    lead: { id: String(lead._id), need: lead.need, conditions: lead.conditions ?? [], suburb: lead.suburb, funding: lead.funding },
    matches: ranked,
  });
}
