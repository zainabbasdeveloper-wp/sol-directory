import Lead, { type LeadDoc } from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import Provider from '../models/Provider.js';
import RegisterListing from '../models/RegisterListing.js';
import RegisterLeadNotice from '../models/RegisterLeadNotice.js';
import SuburbGeo from '../models/SuburbGeo.js';
import { EmailService } from './email.service.js';
import { categoryForNeed } from './needCategory.js';
import { siteOrigin, unsubscribeUrl } from './emailTokens.js';
import { trackUrl } from './requestTracking.js';
import {
  requestViewedTemplate, requestRespondedTemplate, weeklyMatchesTemplate,
  providerLeadReminderTemplate, registerLeadNoticeTemplate, registerRequestedNoticeTemplate,
} from './followUpTemplates.js';

/**
 * Everything that happens AFTER an enquiry has been submitted:
 *  - tells the person who asked when a provider first looks at it, and when one takes it up;
 *  - up to four weekly "your matches" emails to people nobody has taken up yet, so they come back to the site;
 *  - one reminder to a provider whose matched enquiry has sat unopened;
 *  - a notice to register listings (businesses on the public register that have not joined) in the area and category.
 * Every function is safe to call repeatedly: each claims its "already sent" marker atomically before sending, so a
 * double click or an overlapping cron run can never send the same email twice, and none of them throw.
 */

const DAY = 24 * 60 * 60 * 1000;
export const WEEKLY_MAX = 4;
const AGED_CARE_CATEGORIES = new Set(['Dementia care', 'Palliative care', 'Residential aged care']);

const slugify = (value: string) => value.trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const hasEmail = (lead: Pick<LeadDoc, 'requesterEmail'>) => /.+@.+\..+/.test(lead.requesterEmail ?? '');

function searchUrl(lead: Pick<LeadDoc, 'suburb'>): string {
  const params = new URLSearchParams();
  if (lead.suburb) params.set('suburb', lead.suburb);
  return `${siteOrigin()}/find-a-provider${params.toString() ? `?${params}` : ''}`;
}

const needLabel = (lead: Pick<LeadDoc, 'need' | 'serviceContext'>) =>
  /^not sure yet$/i.test(lead.need ?? '') ? lead.serviceContext || undefined : lead.need;

// --- To the person who made the request ---------------------------------------------------------------------------

/** First time any matched provider opens the enquiry. Sent once per enquiry. */
export async function notifySearcherViewed(leadId: unknown): Promise<boolean> {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, status: { $ne: 'draft' }, emailOptOut: { $ne: true }, viewedNoticeAt: { $exists: false }, requesterEmail: { $exists: true, $ne: '' } },
      { $set: { viewedNoticeAt: new Date() } },
    );
    if (!lead || !hasEmail(lead)) return false;
    const viewedCount = await LeadMatch.countDocuments({ leadId: lead._id, status: { $in: ['viewed', 'contacted'] } });
    const ok = await EmailService.sendTemplate(
      lead.requesterEmail,
      requestViewedTemplate({ need: needLabel(lead), suburb: lead.suburb, viewedCount: Math.max(1, viewedCount), searchUrl: searchUrl(lead), unsubscribeUrl: unsubscribeUrl('lead', String(lead._id)), trackUrl: trackUrl(String(lead._id)) }),
      { unsubscribeUrl: unsubscribeUrl('lead', String(lead._id)) },
    );
    if (!ok) await Lead.updateOne({ _id: lead._id }, { $unset: { viewedNoticeAt: 1 } }); // try again on the next view
    return ok;
  } catch (err) {
    console.error('[leadFollowUp] notifySearcherViewed failed:', err);
    return false;
  }
}

/** First time a provider takes up (unlocks) the enquiry. Sent once per enquiry. */
export async function notifySearcherResponded(leadId: unknown, providerName: string): Promise<boolean> {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, status: { $ne: 'draft' }, emailOptOut: { $ne: true }, respondedNoticeAt: { $exists: false }, requesterEmail: { $exists: true, $ne: '' } },
      { $set: { respondedNoticeAt: new Date() } },
    );
    if (!lead || !hasEmail(lead)) return false;
    const ok = await EmailService.sendTemplate(
      lead.requesterEmail,
      requestRespondedTemplate({ providerName, need: needLabel(lead), suburb: lead.suburb, searchUrl: searchUrl(lead), unsubscribeUrl: unsubscribeUrl('lead', String(lead._id)), trackUrl: trackUrl(String(lead._id)) }),
      { unsubscribeUrl: unsubscribeUrl('lead', String(lead._id)) },
    );
    if (!ok) await Lead.updateOne({ _id: lead._id }, { $unset: { respondedNoticeAt: 1 } });
    return ok;
  } catch (err) {
    console.error('[leadFollowUp] notifySearcherResponded failed:', err);
    return false;
  }
}

/**
 * Weekly "your matches" email for enquiries nobody has taken up: sent 7 days after the enquiry, then every 7 days, up to
 * WEEKLY_MAX times, and never after the person unsubscribes or a provider takes the enquiry up.
 */
export async function sendWeeklyMatchDigests(now = new Date(), limit = 500): Promise<{ checked: number; sent: number }> {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const tooOld = new Date(now.getTime() - 60 * DAY);
  const candidates = await Lead.find({
    status: 'matched',
    emailOptOut: { $ne: true },
    requesterEmail: { $exists: true, $ne: '' },
    createdAt: { $gte: tooOld, $lte: weekAgo },
    $and: [
      { $or: [{ digestCount: { $exists: false } }, { digestCount: { $lt: WEEKLY_MAX } }] },
      { $or: [{ lastDigestAt: { $exists: false } }, { lastDigestAt: { $lte: weekAgo } }] },
    ],
  }).sort({ createdAt: 1 }).limit(limit);

  let sent = 0;
  for (const lead of candidates) {
    try {
      if (!hasEmail(lead)) continue;
      // A provider has already taken this one up: the follow-up has done its job.
      if (await LeadMatch.exists({ leadId: lead._id, respondedAt: { $exists: true } })) continue;

      // Claim this week's send atomically (same digestCount and lastDigestAt we just read), so overlapping runs can't double-send.
      const previousCount = lead.digestCount ?? 0;
      const claimed = await Lead.findOneAndUpdate(
        { _id: lead._id, digestCount: lead.digestCount ?? { $exists: false }, ...(lead.lastDigestAt ? { lastDigestAt: lead.lastDigestAt } : { lastDigestAt: { $exists: false } }) },
        { $set: { lastDigestAt: now, digestCount: previousCount + 1 } },
      );
      if (!claimed) continue;

      const matches = await LeadMatch.find({ leadId: lead._id }).sort({ score: -1 }).limit(10).lean();
      const providers = matches.length
        ? await Provider.find({ _id: { $in: matches.map((m) => m.providerId) }, accountStatus: 'active', listingPaused: { $ne: true } }).select('tradingName legalEntityName slug').lean()
        : [];
      const byId = new Map(providers.map((p) => [String(p._id), p]));
      const shown = matches.map((m) => byId.get(String(m.providerId))).filter(Boolean).slice(0, 5) as typeof providers;

      const ok = await EmailService.sendTemplate(
        lead.requesterEmail,
        weeklyMatchesTemplate({
          need: needLabel(lead), suburb: lead.suburb, weekNumber: previousCount + 1,
          viewedCount: matches.filter((m) => m.status === 'viewed' || m.status === 'contacted').length,
          matchedCount: matches.length,
          providers: shown.map((p) => ({ name: p.tradingName || p.legalEntityName, url: `${siteOrigin()}/directory/${p.slug}` })),
          searchUrl: searchUrl(lead),
          unsubscribeUrl: unsubscribeUrl('lead', String(lead._id)),
        }),
        { unsubscribeUrl: unsubscribeUrl('lead', String(lead._id)) },
      );
      if (ok) sent++;
      else await Lead.updateOne({ _id: lead._id }, { $set: { digestCount: previousCount, ...(claimed.lastDigestAt ? { lastDigestAt: claimed.lastDigestAt } : {}) }, ...(claimed.lastDigestAt ? {} : { $unset: { lastDigestAt: 1 } }) });
    } catch (err) {
      console.error('[leadFollowUp] weekly digest failed for lead', String(lead._id), err);
    }
  }
  return { checked: candidates.length, sent };
}

// --- To a provider ---------------------------------------------------------------------------------------------------

/** One email per provider listing every matched enquiry they have left unopened for 48 hours. Each enquiry is only ever reminded about once. */
export async function sendProviderReminders(now = new Date()): Promise<{ providers: number; enquiries: number }> {
  const waitedLongEnough = new Date(now.getTime() - 2 * DAY);
  const notTooOld = new Date(now.getTime() - 14 * DAY);
  const due = await LeadMatch.find({
    status: 'notified', reminderSentAt: { $exists: false }, notifiedAt: { $lte: waitedLongEnough, $gte: notTooOld },
  }).select('_id leadId providerId').lean();

  // Only enquiries that are still open.
  const openLeadIds = new Set((await Lead.find({ _id: { $in: due.map((d) => d.leadId) }, status: 'matched' }).select('_id').lean()).map((l) => String(l._id)));
  const byProvider = new Map<string, string[]>();
  for (const m of due) {
    if (!openLeadIds.has(String(m.leadId))) continue;
    (byProvider.get(String(m.providerId)) ?? byProvider.set(String(m.providerId), []).get(String(m.providerId))!).push(String(m._id));
  }

  let providersEmailed = 0, enquiries = 0;
  for (const [providerId, matchIds] of byProvider) {
    try {
      const provider = await Provider.findOne({ _id: providerId, accountStatus: 'active', listingPaused: { $ne: true }, claimed: { $ne: false } })
        .select('tradingName legalEntityName intakeEmail').lean();
      if (!provider?.intakeEmail) continue;
      // Mark first (atomic), then send; put the markers back if the send fails so tomorrow's run tries again.
      const marked = await LeadMatch.updateMany({ _id: { $in: matchIds }, reminderSentAt: { $exists: false } }, { $set: { reminderSentAt: now } });
      if (!marked.modifiedCount) continue;
      const ok = await EmailService.sendTemplate(
        provider.intakeEmail,
        providerLeadReminderTemplate({ providerName: provider.tradingName || provider.legalEntityName, count: marked.modifiedCount, dashboardUrl: `${siteOrigin()}/leads` }),
      );
      if (ok) { providersEmailed++; enquiries += marked.modifiedCount; }
      else await LeadMatch.updateMany({ _id: { $in: matchIds }, reminderSentAt: now }, { $unset: { reminderSentAt: 1 } });
    } catch (err) {
      console.error('[leadFollowUp] provider reminder failed for provider', providerId, err);
    }
  }
  return { providers: providersEmailed, enquiries };
}

// --- To register listings --------------------------------------------------------------------------------------------

const REGISTER_NOTICES_PER_LEAD = () => Math.max(1, Number(process.env.REGISTER_NOTICES_PER_LEAD) || 10);
const REGISTER_RADIUS_KM = () => Math.max(1, Number(process.env.REGISTER_NOTICE_RADIUS_KM) || 20);
const MIN_DAYS_BETWEEN_NOTICES = 3;
const MAX_NOTICES_PER_30_DAYS = 4;

/**
 * Tells register listings near a new enquiry about it. Deliberately narrow:
 *  - OFF unless REGISTER_LEAD_EMAILS=1, so nothing is sent to businesses until you switch it on;
 *  - only when the service is known (from the page the visitor opened the form on) and maps to a register category;
 *  - only listings whose published email was verified against their own website, that have not opted out, and have
 *    not joined (joined providers get their normal lead emails instead);
 *  - at most REGISTER_NOTICES_PER_LEAD (default 10) per enquiry, each listing at most once every 3 days and 4 times a month;
 *  - never includes anything about the person: only the service and suburb.
 */
export async function notifyRegisterListings(lead: LeadDoc): Promise<{ sent: number; reason?: string }> {
  if (process.env.REGISTER_LEAD_EMAILS !== '1') return { sent: 0, reason: 'disabled' };
  try {
    const category = categoryForNeed(lead.need, lead.serviceContext);
    if (!category) return { sent: 0, reason: 'service unknown' };
    const types = AGED_CARE_CATEGORIES.has(category) ? ['aged_care'] : lead.fundingType === 'Aged Care' ? ['aged_care', 'ndis'] : ['ndis'];

    // Which suburbs count as "near": everything within the radius of where the enquiry is, or at least the suburb itself.
    const nearby: { state: string; suburbSlug: string }[] = [];
    const point = lead.location?.coordinates;
    if (point?.length === 2) {
      const geos = await SuburbGeo.find({
        failed: { $ne: true },
        location: { $near: { $geometry: { type: 'Point', coordinates: point }, $maxDistance: REGISTER_RADIUS_KM() * 1000 } },
      }).select('state suburbSlug').limit(120).lean();
      nearby.push(...geos.map((g) => ({ state: g.state, suburbSlug: g.suburbSlug })));
    }
    if (lead.suburb && lead.state) nearby.push({ state: lead.state.toUpperCase(), suburbSlug: slugify(lead.suburb) });
    if (!nearby.length) return { sent: 0, reason: 'no known area' };

    const slugsByState = new Map<string, Set<string>>();
    for (const n of nearby) (slugsByState.get(n.state) ?? slugsByState.set(n.state, new Set()).get(n.state)!).add(n.suburbSlug);

    const candidates = await RegisterListing.find({
      type: { $in: types },
      claimStatus: 'unclaimed',
      emailOptOut: { $ne: true },
      contactVerified: true,
      email: { $exists: true, $ne: '' },
      supportCategories: category,
      $or: [...slugsByState].map(([state, slugs]) => ({ areas: { $elemMatch: { state, suburbSlug: { $in: [...slugs] } } } })),
    }).select('_id type slug name email').limit(300).lean();
    if (!candidates.length) return { sent: 0, reason: 'no listings nearby' };

    // Fairness and caps: skip anyone told too recently or too often, then spread the notices around.
    const recent = new Date(Date.now() - MIN_DAYS_BETWEEN_NOTICES * DAY);
    const month = new Date(Date.now() - 30 * DAY);
    const eligible: typeof candidates = [];
    for (const c of candidates.sort(() => Math.random() - 0.5)) {
      if (eligible.length >= REGISTER_NOTICES_PER_LEAD()) break;
      if (await RegisterLeadNotice.exists({ listingId: c._id, sentAt: { $gte: recent } })) continue;
      if ((await RegisterLeadNotice.countDocuments({ listingId: c._id, sentAt: { $gte: month } })) >= MAX_NOTICES_PER_30_DAYS) continue;
      eligible.push(c);
    }

    let sent = 0;
    for (const listing of eligible) {
      try {
        await RegisterLeadNotice.create({ leadId: lead._id, listingId: listing._id }); // unique: never the same enquiry twice
      } catch {
        continue;
      }
      const path = listing.type === 'aged_care' ? 'aged-care-providers' : 'ndis-providers';
      const unsub = unsubscribeUrl('listing', String(listing._id));
      const ok = await EmailService.sendTemplate(
        listing.email as string,
        registerLeadNoticeTemplate({ listingName: listing.name, category, suburb: lead.suburb, listingUrl: `${siteOrigin()}/${path}/${listing.slug}`, unsubscribeUrl: unsub }),
        { unsubscribeUrl: unsub },
      );
      if (ok) { sent++; await RegisterLeadNotice.updateOne({ leadId: lead._id, listingId: listing._id }, { $set: { delivered: true } }); }
      else await RegisterLeadNotice.deleteOne({ leadId: lead._id, listingId: listing._id }); // nothing went out, so it must not count against the caps
    }
    return { sent };
  } catch (err) {
    console.error('[leadFollowUp] notifyRegisterListings failed:', err);
    return { sent: 0, reason: 'error' };
  }
}

/**
 * The person asked for one register business by name. If that business has a verified email on file, has not opted
 * out and has not joined, tell it so (no details about the person are included). Off unless REGISTER_LEAD_EMAILS=1,
 * like every other message to a register business. Never throws.
 */
export async function notifyPreferredListing(lead: LeadDoc, listingId: unknown): Promise<{ sent: boolean; reason?: string }> {
  if (process.env.REGISTER_LEAD_EMAILS !== '1') return { sent: false, reason: 'disabled' };
  try {
    const listing = await RegisterListing.findById(listingId).select('type slug name email contactVerified emailOptOut claimStatus').lean();
    if (!listing) return { sent: false, reason: 'listing not found' };
    if (listing.claimStatus === 'claimed') return { sent: false, reason: 'member' };
    if (listing.emailOptOut) return { sent: false, reason: 'opted out' };
    if (!listing.contactVerified || !listing.email) return { sent: false, reason: 'no verified email' };
    try {
      await RegisterLeadNotice.create({ leadId: lead._id, listingId: listing._id });
    } catch {
      return { sent: false, reason: 'already sent' };
    }
    const path = listing.type === 'aged_care' ? 'aged-care-providers' : 'ndis-providers';
    const unsub = unsubscribeUrl('listing', String(listing._id));
    const ok = await EmailService.sendTemplate(
      listing.email as string,
      registerRequestedNoticeTemplate({ listingName: listing.name, suburb: lead.suburb, listingUrl: `${siteOrigin()}/${path}/${listing.slug}`, unsubscribeUrl: unsub }),
      { unsubscribeUrl: unsub },
    );
    if (ok) await RegisterLeadNotice.updateOne({ leadId: lead._id, listingId: listing._id }, { $set: { delivered: true } });
    else await RegisterLeadNotice.deleteOne({ leadId: lead._id, listingId: listing._id });
    return { sent: ok, reason: ok ? undefined : 'send failed' };
  } catch (err) {
    console.error('[leadFollowUp] notifyPreferredListing failed:', err);
    return { sent: false, reason: 'error' };
  }
}
