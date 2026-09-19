import type { Request, Response } from 'express';
import Provider from '../models/Provider.js';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';

/**
 * Real, public numbers for the marketing pages (developer brief: "Real
 * stats block computed nightly"). Replaces hardcoded figures like
 * "6,412 providers" / "7 min median reply" that were typed into the
 * frontend and had no relationship to the database.
 *
 * Every figure here is either computed from real records or null —
 * never estimated, never padded. The frontend hides any null stat
 * rather than showing a placeholder, so a young directory shows
 * honestly small numbers instead of invented ones.
 */
export interface PublicStats {
  providersListed: number;
  suburbsCovered: number;
  enquiriesLast30Days: number;
  /** Median minutes from a provider being notified to first engaging with the lead. null until there's enough data. */
  medianFirstReplyMinutes: number | null;
  /** Listed providers per state, keyed by abbreviation (NSW, VIC, …). States with none are absent. */
  providersByState: Record<string, number>;
  /** Listed providers per registration group — the exact value the directory's ?service= filter matches on. */
  providersByService: Record<string, number>;
  generatedAt: string;
}

// Provider.businessAddress.state is free text (imports and onboarding
// both write it), so accept full names as well as abbreviations.
const STATE_ALIASES: Record<string, string> = {
  nsw: 'NSW', 'new south wales': 'NSW',
  vic: 'VIC', victoria: 'VIC',
  qld: 'QLD', queensland: 'QLD',
  sa: 'SA', 'south australia': 'SA',
  wa: 'WA', 'western australia': 'WA',
  tas: 'TAS', tasmania: 'TAS',
  nt: 'NT', 'northern territory': 'NT',
  act: 'ACT', 'australian capital territory': 'ACT',
};
function normaliseState(raw: unknown): string | null {
  return STATE_ALIASES[String(raw ?? '').trim().toLowerCase()] ?? null;
}

// A median of two or three replies is noise, not a statistic — don't
// publish one until there's a meaningful sample.
const MIN_REPLY_SAMPLE = 5;
// Only look at recent activity so the figure tracks how the directory
// performs NOW, and the aggregation stays cheap as data grows.
const REPLY_WINDOW_DAYS = 90;
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { at: number; value: PublicStats } | null = null;

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function computePublicStats(now = new Date()): Promise<PublicStats> {
  // A provider counts as "listed" only if they'd actually appear in
  // search and matching — active and not paused for unconfirmed capacity.
  // Same predicate listProviders / submitMatchRequest use.
  const listedFilter = { accountStatus: 'active', listingPaused: { $ne: true } };

  const since30 = new Date(now.getTime() - 30 * 86400000);
  const replySince = new Date(now.getTime() - REPLY_WINDOW_DAYS * 86400000);

  const [providersListed, suburbLists, enquiriesLast30Days, firstReplies, stateRows, serviceRows] = await Promise.all([
    Provider.countDocuments(listedFilter),
    Provider.distinct('serviceSuburbs', listedFilter),
    Lead.countDocuments({ status: { $ne: 'draft' }, createdAt: { $gte: since30 } }),
    // First engagement per lead: the earliest respondedAt across every
    // provider notified about it, measured from when they were notified.
    LeadMatch.aggregate([
      { $match: { respondedAt: { $exists: true, $gte: replySince }, status: 'contacted' } },
      { $group: { _id: '$leadId', firstResponse: { $min: '$respondedAt' }, notified: { $min: '$notifiedAt' } } },
      { $project: { ms: { $subtract: ['$firstResponse', '$notified'] } } },
      { $match: { ms: { $gte: 0 } } },
    ]),
    Provider.aggregate([{ $match: listedFilter }, { $group: { _id: '$businessAddress.state', n: { $sum: 1 } } }]),
    Provider.aggregate([
      { $match: listedFilter },
      { $unwind: '$registrationGroups' },
      { $group: { _id: '$registrationGroups', n: { $sum: 1 } } },
    ]),
  ]);

  const providersByState: Record<string, number> = {};
  for (const row of stateRows as { _id: unknown; n: number }[]) {
    const abbr = normaliseState(row._id);
    if (abbr) providersByState[abbr] = (providersByState[abbr] ?? 0) + row.n;
  }
  const providersByService: Record<string, number> = {};
  for (const row of serviceRows as { _id: unknown; n: number }[]) {
    if (row._id) providersByService[String(row._id)] = row.n;
  }

  // Normalise before counting distinct — "Bankstown" and "bankstown "
  // are one suburb.
  const suburbs = new Set(
    (suburbLists as unknown[]).map((s) => String(s).trim().toLowerCase()).filter(Boolean)
  );

  const replyMinutes = firstReplies.map((r: { ms: number }) => r.ms / 60000).sort((a: number, b: number) => a - b);
  const medianFirstReplyMinutes = replyMinutes.length >= MIN_REPLY_SAMPLE ? Math.max(1, Math.round(median(replyMinutes))) : null;

  return {
    providersListed,
    suburbsCovered: suburbs.size,
    enquiriesLast30Days,
    medianFirstReplyMinutes,
    providersByState,
    providersByService,
    generatedAt: now.toISOString(),
  };
}

export async function getPublicStats(_req: Request, res: Response) {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    try {
      cache = { at: Date.now(), value: await computePublicStats() };
    } catch (err) {
      console.error('[stats] compute failed:', err);
      // Serve the last good value if we have one; a stats hiccup must
      // never take the home page down.
      if (!cache) return res.status(503).json({ error: 'Stats temporarily unavailable' });
    }
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.json(cache!.value);
}
