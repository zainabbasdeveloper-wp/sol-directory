import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import EmailLog from '../models/EmailLog.js';
import JobRun from '../models/JobRun.js';
import RegisterListing from '../models/RegisterListing.js';
import RegisterLeadNotice from '../models/RegisterLeadNotice.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Worker from '../models/Worker.js';
import { EmailService } from '../services/email.service.js';
import { JOB_CATALOG, type JobHealth } from '../services/jobCatalog.js';

const DAY = 86400000;
// Days on the charts are cut in the business's own time zone, not UTC.
const TZ = 'Australia/Melbourne';

type Severity = 'critical' | 'warning' | 'info';
interface Alert { severity: Severity; message: string; link?: string; linkLabel?: string }

/** Fills in the days that had nothing so a chart shows a flat zero instead of skipping them. */
function fillDays(rows: { _id: string; n: number }[], days: number): { date: string; count: number }[] {
  const byDay = new Map(rows.map((r) => [r._id, r.n]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() - i * DAY));
    out.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

const dayKey = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } };

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function getOperations(_req: AuthedRequest, res: Response) {
  const now = Date.now();
  const since24h = new Date(now - DAY);
  const since7d = new Date(now - 7 * DAY);
  const since14d = new Date(now - 14 * DAY);
  const since30d = new Date(now - 30 * DAY);
  const submitted = { status: { $ne: 'draft' } };

  const [
    emailStatus24h, emailStatus7d, emailDaily, recentFailures,
    leadDaily, leadIds30d, recentLeads,
    jobRuns,
    registerTotals, claimCounts, pendingClaims,
    noticesTotal, notices7d,
    digests7d, viewedNotices7d, respondedNotices7d, reminders7d,
    pendingWorkers, staleLeads,
  ] = await Promise.all([
    EmailLog.aggregate([{ $match: { createdAt: { $gte: since24h } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    EmailLog.aggregate([{ $match: { createdAt: { $gte: since7d } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    EmailLog.aggregate([
      { $match: { createdAt: { $gte: since14d } } },
      { $group: { _id: { day: dayKey, status: '$status' }, n: { $sum: 1 } } },
    ]),
    EmailLog.find({ status: 'failed', createdAt: { $gte: since7d } }).sort({ createdAt: -1 }).limit(5).lean(),
    Lead.aggregate([{ $match: { ...submitted, createdAt: { $gte: since14d } } }, { $group: { _id: dayKey, n: { $sum: 1 } } }]),
    Lead.find({ ...submitted, createdAt: { $gte: since30d } }).select('_id').lean(),
    Lead.find(submitted).sort({ createdAt: -1 }).limit(8).select('need suburb state serviceContext status createdAt').lean(),
    JobRun.find({ name: { $in: JOB_CATALOG.map((j) => j.name) } }).sort({ startedAt: -1 }).limit(200).lean(),
    RegisterListing.aggregate([{
      $group: {
        _id: null,
        total: { $sum: 1 },
        ndis: { $sum: { $cond: [{ $eq: ['$type', 'ndis'] }, 1, 0] } },
        agedCare: { $sum: { $cond: [{ $eq: ['$type', 'aged_care'] }, 1, 0] } },
        withEmail: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$email', ''] } }, 0] }, 1, 0] } },
        withPhone: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$phone', ''] } }, 0] }, 1, 0] } },
        withWebsite: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$website', ''] } }, 0] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$contactVerified', true] }, 1, 0] } },
        notifiable: {
          $sum: { $cond: [{ $and: [
            { $eq: ['$claimStatus', 'unclaimed'] }, { $eq: ['$contactVerified', true] },
            { $gt: [{ $strLenCP: { $ifNull: ['$email', ''] } }, 0] }, { $ne: ['$emailOptOut', true] },
          ] }, 1, 0] },
        },
        optedOut: { $sum: { $cond: [{ $eq: ['$emailOptOut', true] }, 1, 0] } },
        withLanguages: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$languages', []] } }, 0] }, 1, 0] } },
      },
    }]),
    RegisterListing.aggregate([{ $group: { _id: '$claimStatus', n: { $sum: 1 } } }]),
    ClaimRequest.countDocuments({ status: 'new' }),
    RegisterLeadNotice.countDocuments({ delivered: true }),
    RegisterLeadNotice.countDocuments({ delivered: true, sentAt: { $gte: since7d } }),
    Lead.countDocuments({ lastDigestAt: { $gte: since7d } }),
    Lead.countDocuments({ viewedNoticeAt: { $gte: since7d } }),
    Lead.countDocuments({ respondedNoticeAt: { $gte: since7d } }),
    LeadMatch.countDocuments({ reminderSentAt: { $gte: since7d } }),
    Worker.countDocuments({ verificationStatus: 'awaiting_review' }),
    // Matched, nobody has opened it, and it is more than a day old.
    Lead.countDocuments({ ...submitted, status: 'matched', createdAt: { $lte: since24h, $gte: since7d } }),
  ]);

  // --- Enquiry pipeline (last 30 days) ---
  const ids30 = leadIds30d.map((l: any) => l._id);
  const [withMatches, viewed, responded] = await Promise.all([
    LeadMatch.distinct('leadId', { leadId: { $in: ids30 } }),
    LeadMatch.distinct('leadId', { leadId: { $in: ids30 }, $or: [{ viewedAt: { $exists: true } }, { status: { $in: ['viewed', 'contacted'] } }] }),
    LeadMatch.distinct('leadId', { leadId: { $in: ids30 }, $or: [{ respondedAt: { $exists: true } }, { status: 'contacted' }] }),
  ]);
  const matchedSet = new Set(withMatches.map(String)), viewedSet = new Set(viewed.map(String)), respondedSet = new Set(responded.map(String));
  const pipeline = {
    submitted: ids30.length,
    matched: matchedSet.size,
    unmatched: ids30.length - matchedSet.size,
    viewed: viewedSet.size,
    responded: respondedSet.size,
  };

  const recentIds = recentLeads.map((l: any) => l._id);
  const recentMatches = await LeadMatch.find({ leadId: { $in: recentIds } }).select('leadId status viewedAt respondedAt').lean();
  const enquiries = recentLeads.map((l: any) => {
    const ms = recentMatches.filter((m: any) => String(m.leadId) === String(l._id));
    return {
      id: String(l._id),
      ref: String(l._id).slice(-8).toUpperCase(),
      need: l.need && l.need !== 'Not sure yet' ? l.need : (l.serviceContext || 'Not specified'),
      location: [l.suburb, l.state].filter(Boolean).join(', ') || '—',
      matched: ms.length,
      viewed: ms.some((m: any) => m.viewedAt || ['viewed', 'contacted'].includes(m.status)),
      responded: ms.some((m: any) => m.respondedAt || m.status === 'contacted'),
      createdAt: l.createdAt,
    };
  });

  // --- Email delivery ---
  const tally = (rows: { _id: string; n: number }[]) => ({
    sent: rows.find((r) => r._id === 'sent')?.n ?? 0,
    failed: rows.find((r) => r._id === 'failed')?.n ?? 0,
    skipped: rows.find((r) => r._id === 'skipped_not_configured')?.n ?? 0,
  });
  const email24h = tally(emailStatus24h as any), email7d = tally(emailStatus7d as any);
  const emailSeries = fillDays([], 14).map((d) => {
    const row = (emailDaily as any[]).filter((r) => r._id.day === d.date);
    return { date: d.date, sent: row.find((r) => r._id.status === 'sent')?.n ?? 0, failed: row.find((r) => r._id.status === 'failed')?.n ?? 0 };
  });

  // --- Scheduled jobs ---
  const jobs = JOB_CATALOG.map((def) => {
    const runs = (jobRuns as any[]).filter((r) => r.name === def.name);
    const last = runs[0];
    const lastFinished = runs.find((r) => r.status !== 'running');
    let health: JobHealth;
    if (!last) health = 'never_run';
    else if (last.status === 'running' && now - new Date(last.startedAt).getTime() < 30 * 60000) health = 'running';
    else if (lastFinished?.status === 'failed') health = 'failed';
    else if (now - new Date(lastFinished?.startedAt ?? last.startedAt).getTime() > def.everyHours * 2.5 * 3600000) health = 'overdue';
    else health = 'ok';
    return {
      ...def,
      health,
      lastRunAt: last?.startedAt ?? null,
      lastSummary: lastFinished?.summary ?? null,
      lastError: lastFinished?.error ?? null,
      lastDurationMs: lastFinished?.durationMs ?? null,
      history: runs.slice(0, 7).map((r) => ({ at: r.startedAt, status: r.status })),
    };
  });

  // --- Directory ---
  const reg = (registerTotals as any[])[0] ?? {};
  const claims = Object.fromEntries((claimCounts as any[]).map((c) => [c._id ?? 'unknown', c.n]));
  const registerLeadEmailsOn = process.env.REGISTER_LEAD_EMAILS === '1';

  // --- System checks (booleans only; no values are ever sent to the browser) ---
  const system = {
    database: mongoose.connection.readyState === 1,
    email: !!(process.env.SMTP_URL || (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD)),
    adminAlerts: !!(process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFY_EMAIL),
    senderIdentity: !!(process.env.SENDER_ADDRESS_LINE && process.env.SENDER_CONTACT_EMAIL),
    sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    payments: !!process.env.STRIPE_SECRET_KEY,
    maps: !!process.env.MAPBOX_ACCESS_TOKEN,
    registerLeadEmails: registerLeadEmailsOn,
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
  };

  // --- What needs attention, most urgent first ---
  const alerts: Alert[] = [];
  if (!system.database) alerts.push({ severity: 'critical', message: 'The database connection is down.' });
  if (!system.email) alerts.push({ severity: 'critical', message: 'Email is not configured — no confirmation or alert emails are being sent.', link: '/admin/diagnostics', linkLabel: 'Open diagnostics' });
  if (!system.adminAlerts) alerts.push({ severity: 'warning', message: 'No admin alert address is set (ADMIN_NOTIFICATION_EMAIL), so you will not be emailed about new enquiries.' });
  if (email24h.failed > 0) alerts.push({ severity: 'critical', message: `${email24h.failed} email${email24h.failed === 1 ? '' : 's'} failed to send in the last 24 hours.`, link: '/admin/diagnostics', linkLabel: 'See why' });
  for (const j of jobs) {
    if (j.health === 'failed') alerts.push({ severity: 'critical', message: `Scheduled job "${j.label}" failed on its last run${j.lastError ? `: ${j.lastError}` : '.'}` });
    else if (j.health === 'overdue') alerts.push({ severity: 'warning', message: `Scheduled job "${j.label}" has not run on time (expected ${j.schedule.toLowerCase()}).` });
    else if (j.health === 'never_run') alerts.push({ severity: 'warning', message: `Scheduled job "${j.label}" has never run — add its cron line on the server.` });
  }
  if (pipeline.unmatched > 0) alerts.push({ severity: 'warning', message: `${pipeline.unmatched} enquir${pipeline.unmatched === 1 ? 'y' : 'ies'} in the last 30 days matched no provider.` });
  if (staleLeads > 0) alerts.push({ severity: 'info', message: `${staleLeads} enquir${staleLeads === 1 ? 'y has' : 'ies have'} waited over 24 hours with no response.` });
  if (pendingWorkers > 0) alerts.push({ severity: 'info', message: `${pendingWorkers} worker${pendingWorkers === 1 ? '' : 's'} awaiting verification.`, link: '/verification', linkLabel: 'Review' });
  if (pendingClaims > 0) alerts.push({ severity: 'info', message: `${pendingClaims} listing claim${pendingClaims === 1 ? '' : 's'} awaiting review.`, link: '/admin/claims', linkLabel: 'Review' });
  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  res.json({
    generatedAt: new Date().toISOString(),
    alerts,
    system,
    jobs,
    enquiries: { pipeline, daily: fillDays(leadDaily as any, 14), recent: enquiries },
    email: {
      last24h: email24h,
      last7d: email7d,
      daily: emailSeries,
      recentFailures: (recentFailures as any[]).map((f) => ({ to: maskEmail(String(f.to)), subject: f.subject, error: f.error ?? null, at: f.createdAt })),
    },
    automation: {
      last7d: {
        searcherViewed: viewedNotices7d,
        searcherResponded: respondedNotices7d,
        weeklyMatches: digests7d,
        providerReminders: reminders7d,
        registerNotices: notices7d,
      },
      registerNoticesTotal: noticesTotal,
      registerLeadEmailsOn,
    },
    directory: {
      total: reg.total ?? 0, ndis: reg.ndis ?? 0, agedCare: reg.agedCare ?? 0,
      withEmail: reg.withEmail ?? 0, withPhone: reg.withPhone ?? 0, withWebsite: reg.withWebsite ?? 0,
      verifiedEmails: reg.verified ?? 0, notifiable: reg.notifiable ?? 0, optedOut: reg.optedOut ?? 0,
      withLanguages: reg.withLanguages ?? 0,
      claims: { unclaimed: claims.unclaimed ?? 0, requested: claims.requested ?? 0, claimed: claims.claimed ?? 0 },
      pendingClaims,
    },
  });
}

/** Sends one test alert to the admin address so it is easy to check that alerts arrive. */
export async function sendTestAdminEmail(_req: AuthedRequest, res: Response) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return res.status(400).json({ error: 'No admin alert address is set. Add ADMIN_NOTIFICATION_EMAIL to the API settings.' });
  const sent = await EmailService.notifyAdmin('Test alert', 'This is a test from the SolDirectory admin dashboard. If you can read it, admin alerts are reaching you.');
  if (!sent) return res.status(502).json({ error: 'The email could not be sent. Check the email settings in Diagnostics.' });
  res.json({ sent: true, to: maskEmail(to) });
}
