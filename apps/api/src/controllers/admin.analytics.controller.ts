import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Worker from '../models/Worker.js';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import EmailLog from '../models/EmailLog.js';
import ClaimRequest from '../models/ClaimRequest.js';
import RegisterListing from '../models/RegisterListing.js';
import { categoryForNeed } from '../services/needCategory.js';

const DAY = 86400000;
const TZ = 'Australia/Melbourne';
const EXPORT_LIMIT = 10000;

/** Start of the selected period, or null for "all time". Same choices as the dashboard drop-down. */
function periodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case '7d': return new Date(now.getTime() - 7 * DAY);
    case '30d': return new Date(now.getTime() - 30 * DAY);
    case '90d': return new Date(now.getTime() - 90 * DAY);
    case '1y': return new Date(now.getTime() - 365 * DAY);
    default: return null;
  }
}

const monthKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(d).slice(0, 7);
const median = (nums: number[]) => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function topCounts(map: Map<string, number>, limit: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, count]) => ({ label, count }));
}

/** Everything the dashboard's growth, progress and breakdown charts need, in one request. */
export async function getAnalytics(req: AuthedRequest, res: Response) {
  const period = String(req.query.period ?? '30d');
  const since = periodStart(period);
  const now = new Date();
  const submitted = { status: { $ne: 'draft' } };
  const inPeriod = since ? { createdAt: { $gte: since } } : {};

  // --- Comparison with the window just before this one (not meaningful for "all time") ---
  let compare: null | { current: Record<string, number>; previous: Record<string, number> } = null;
  if (since) {
    const span = now.getTime() - since.getTime();
    const prev = { createdAt: { $gte: new Date(since.getTime() - span), $lt: since } };
    const cur = { createdAt: { $gte: since } };
    const [cu, cp, cw, cl, ce, pu, pp, pw, pl, pe] = await Promise.all([
      User.countDocuments(cur), Provider.countDocuments(cur), Worker.countDocuments(cur), Lead.countDocuments({ ...submitted, ...cur }), EmailLog.countDocuments({ ...cur, status: 'sent' }),
      User.countDocuments(prev), Provider.countDocuments(prev), Worker.countDocuments(prev), Lead.countDocuments({ ...submitted, ...prev }), EmailLog.countDocuments({ ...prev, status: 'sent' }),
    ]);
    compare = {
      current: { users: cu, providers: cp, workers: cw, enquiries: cl, emailsSent: ce },
      previous: { users: pu, providers: pp, workers: pw, enquiries: pl, emailsSent: pe },
    };
  }

  // --- Last 12 months, month by month ---
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthTags: string[] = [];
  for (let i = 11; i >= 0; i--) monthTags.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  const monthExpr = { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } };

  const [usersMonthly, usersBefore, leadsMonthly, emailsMonthly, leadsInPeriod, weekdays, matchesWithReply, plans, claimStatus, listingsClaimed, listingsTotal, pendingLeadsOld] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: startMonth } } }, { $group: { _id: { m: monthExpr, role: '$role' }, n: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $lt: startMonth } }),
    Lead.aggregate([{ $match: { ...submitted, createdAt: { $gte: startMonth } } }, { $group: { _id: monthExpr, n: { $sum: 1 } } }]),
    EmailLog.aggregate([{ $match: { status: 'sent', createdAt: { $gte: startMonth } } }, { $group: { _id: monthExpr, n: { $sum: 1 } } }]),
    Lead.find({ ...submitted, ...inPeriod }).select('need serviceContext state fundingType').limit(20000).lean(),
    Lead.aggregate([
      { $match: { ...submitted, ...inPeriod } },
      { $group: { _id: { $dayOfWeek: { date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } },
    ]),
    LeadMatch.aggregate([
      { $match: { respondedAt: { $exists: true }, ...(since ? { respondedAt: { $gte: since } } : {}) } },
      { $group: { _id: '$leadId', ms: { $min: { $subtract: ['$respondedAt', '$createdAt'] } } } },
      { $limit: 5000 },
    ]),
    Provider.aggregate([{ $group: { _id: '$plan', n: { $sum: 1 } } }]),
    ClaimRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    RegisterListing.countDocuments({ claimStatus: 'claimed' }),
    RegisterListing.countDocuments(),
    Lead.countDocuments({ ...submitted, status: 'matched', createdAt: { $lte: new Date(now.getTime() - DAY) } }),
  ]);

  const roles = ['worker', 'provider', 'coordinator', 'participant'] as const;
  let running = usersBefore;
  const monthly = monthTags.map((tag) => {
    const row: Record<string, number | string> = { month: tag };
    let added = 0;
    for (const role of roles) {
      const n = (usersMonthly as any[]).find((r) => r._id.m === tag && r._id.role === role)?.n ?? 0;
      row[role] = n;
      added += n;
    }
    // Admin accounts are counted in the running total but not charted as a role.
    added += (usersMonthly as any[]).find((r) => r._id.m === tag && r._id.role === 'admin')?.n ?? 0;
    running += added;
    row.cumulativeUsers = running;
    row.enquiries = (leadsMonthly as any[]).find((r) => r._id === tag)?.n ?? 0;
    row.emailsSent = (emailsMonthly as any[]).find((r) => r._id === tag)?.n ?? 0;
    return row;
  });

  // --- Breakdowns for the selected period ---
  const byService = new Map<string, number>(), byState = new Map<string, number>(), byFunding = new Map<string, number>();
  for (const l of leadsInPeriod as any[]) {
    const service = categoryForNeed(l.need, l.serviceContext) ?? 'Other / not specified';
    byService.set(service, (byService.get(service) ?? 0) + 1);
    const state = (l.state ?? '').toString().trim().toUpperCase() || 'Unknown';
    byState.set(state, (byState.get(state) ?? 0) + 1);
    const funding = (l.fundingType ?? '').toString().trim() || 'Not stated';
    byFunding.set(funding, (byFunding.get(funding) ?? 0) + 1);
  }
  // $dayOfWeek: 1 = Sunday … 7 = Saturday; shown Monday first.
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dow = [2, 3, 4, 5, 6, 7, 1];
  const byWeekday = dow.map((d, i) => ({ label: weekdayNames[i], count: (weekdays as any[]).find((r) => r._id === d)?.n ?? 0 }));

  const replyMinutes = (matchesWithReply as any[]).map((r) => r.ms / 60000).filter((m) => m >= 0);
  const med = median(replyMinutes);

  res.json({
    period,
    generatedAt: now.toISOString(),
    compare,
    monthly,
    breakdowns: {
      enquiriesInPeriod: (leadsInPeriod as any[]).length,
      byService: topCounts(byService, 8),
      byState: topCounts(byState, 9),
      byFunding: topCounts(byFunding, 6),
      byWeekday,
    },
    firstResponse: { medianMinutes: med === null ? null : Math.max(1, Math.round(med)), sample: replyMinutes.length },
    plans: Object.fromEntries((plans as any[]).map((p) => [p._id ?? 'starter', p.n])),
    claims: Object.fromEntries((claimStatus as any[]).map((c) => [c._id, c.n])),
    directory: { claimed: listingsClaimed, total: listingsTotal },
    waitingOverDay: pendingLeadsOld,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------------------------------------------------

/** Quotes a cell and neutralises spreadsheet formulas (a cell starting with = + - @ would run as one in Excel). */
function cell(value: unknown): string {
  let text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join('; ') : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  // BOM so Excel opens accented characters correctly.
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

const EXPORTS = ['enquiries', 'users', 'providers', 'workers', 'emails'] as const;
type ExportType = (typeof EXPORTS)[number];

export async function exportCsv(req: AuthedRequest, res: Response) {
  const type = String(req.query.type ?? '') as ExportType;
  if (!EXPORTS.includes(type)) return res.status(400).json({ error: `type must be one of: ${EXPORTS.join(', ')}.` });
  const since = periodStart(String(req.query.period ?? 'all'));
  const inPeriod = since ? { createdAt: { $gte: since } } : {};
  let csv = '';

  if (type === 'enquiries') {
    const docs = await Lead.find({ status: { $ne: 'draft' }, ...inPeriod }).sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();
    const ids = docs.map((d: any) => d._id);
    const matches = await LeadMatch.find({ leadId: { $in: ids } }).select('leadId viewedAt respondedAt status').lean();
    const stats = new Map<string, { matched: number; viewed: boolean; responded: boolean }>();
    for (const m of matches as any[]) {
      const k = String(m.leadId);
      const s = stats.get(k) ?? { matched: 0, viewed: false, responded: false };
      s.matched += 1;
      if (m.viewedAt || ['viewed', 'contacted'].includes(m.status)) s.viewed = true;
      if (m.respondedAt || m.status === 'contacted') s.responded = true;
      stats.set(k, s);
    }
    csv = toCsv(
      ['Reference', 'Received', 'Status', 'Support needed', 'Service page', 'Suburb', 'State', 'Postcode', 'Funding', 'Plan management', 'Timeframe', 'Who it is for', 'Name', 'Email', 'Phone', 'Providers matched', 'Opened by a provider', 'Answered by a provider', 'Stopped follow-up emails'],
      docs.map((d: any) => {
        const s = stats.get(String(d._id)) ?? { matched: 0, viewed: false, responded: false };
        return [String(d._id).slice(-8).toUpperCase(), d.createdAt, d.status, d.need, d.serviceContext, d.suburb, d.state, d.postcode, d.fundingType, d.planManagement, d.timeframe, d.careFor, d.requesterName, d.requesterEmail, d.contactPhone, s.matched, s.viewed ? 'Yes' : 'No', s.responded ? 'Yes' : 'No', d.emailOptOut ? 'Yes' : 'No'];
      })
    );
  } else if (type === 'users') {
    const docs = await User.find(inPeriod).select('name email mobile role createdAt').sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();
    csv = toCsv(['Name', 'Email', 'Mobile', 'Role', 'Joined'], docs.map((u: any) => [u.name, u.email, u.mobile, u.role, u.createdAt]));
  } else if (type === 'providers') {
    const docs = await Provider.find(inPeriod).select('legalEntityName tradingName abn accountStatus plan planStatus intakeStatus serviceSuburbs registrationGroups intakeEmail createdAt').sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();
    csv = toCsv(['Legal name', 'Trading name', 'ABN', 'Account', 'Plan', 'Plan status', 'Taking referrals', 'Services', 'Suburbs', 'Intake email', 'Registered'],
      docs.map((p: any) => [p.legalEntityName, p.tradingName, p.abn, p.accountStatus, p.plan, p.planStatus, p.intakeStatus, p.registrationGroups, p.serviceSuburbs, p.intakeEmail, p.createdAt]));
  } else if (type === 'workers') {
    const docs = await Worker.find(inPeriod).select('firstName lastName role suburb services verificationStatus accountStatus published createdAt').sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();
    csv = toCsv(['Name', 'Role', 'Suburb', 'Services', 'Verification', 'Account', 'Published', 'Registered'],
      docs.map((w: any) => [`${w.firstName ?? ''} ${w.lastName ?? ''}`.trim(), w.role, w.suburb, w.services, w.verificationStatus, w.accountStatus, w.published ? 'Yes' : 'No', w.createdAt]));
  } else {
    const docs = await EmailLog.find(inPeriod).sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();
    csv = toCsv(['Sent at', 'To', 'Subject', 'Status', 'Error'], docs.map((e: any) => [e.createdAt, e.to, e.subject, e.status, e.error]));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="soldirectory-${type}-${stamp}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
}
