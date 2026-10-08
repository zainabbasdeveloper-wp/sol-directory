import 'dotenv/config';
import { connectDB } from '../config/db.js';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import Notification from '../models/Notification.js';
import Provider from '../models/Provider.js';
import { EmailService } from '../services/email.service.js';
import { describeMatchReason, isGenuineMatch, scoreMatch } from '../services/matching.service.js';
import { SmsService } from '../services/sms.service.js';

const DELAY_MINUTES = Math.max(15, Number(process.env.LEAD_ESCALATION_DELAY_MINUTES) || 120);
const PROVIDERS_PER_RUN = Math.max(1, Number(process.env.LEAD_ESCALATION_BATCH_SIZE) || 5);
const MAX_TOTAL_PROVIDERS = Math.max(PROVIDERS_PER_RUN, Number(process.env.MAX_TOTAL_PROVIDERS_PER_LEAD) || 10);
const LEADS_PER_RUN = Math.max(1, Number(process.env.LEAD_ESCALATION_LEADS_PER_RUN) || 100);

function hasPaidLeadAccess(provider: any): boolean {
  return ['growth', 'pro'].includes(provider.plan)
    && provider.planStatus === 'active'
    && (!provider.planExpiresAt || new Date(provider.planExpiresAt) > new Date());
}

async function notifyProvider(lead: any, provider: any): Promise<boolean> {
  const frontendOrigin = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
  const dashboardUrl = `${frontendOrigin}/leads/${lead._id}`;

  if (provider.intakeEmail) {
    if (hasPaidLeadAccess(provider)) {
      await EmailService.sendProviderLeadFull(provider.intakeEmail, {
        need: lead.need,
        suburb: lead.suburb,
        requesterName: lead.requesterName,
        requesterEmail: lead.requesterEmail,
        requesterPhone: lead.contactPhone,
        careFor: lead.careFor,
        timeframe: lead.timeframe,
        fundingType: lead.fundingType,
        planManagement: lead.planManagement,
        additionalDetails: lead.note,
        dashboardUrl,
      });
    } else {
      const claimUrl = provider.claimed === false
        ? `${frontendOrigin}/forgot-password?claim=1&email=${encodeURIComponent(provider.intakeEmail)}`
        : undefined;
      await EmailService.sendProviderLeadTeaser(provider.intakeEmail, lead.need, lead.suburb, dashboardUrl, claimUrl);
    }
  }

  await SmsService.sendToProvider(
    provider,
    `SolDirectory: new ${lead.need} enquiry in ${lead.suburb}. View and respond: ${dashboardUrl}`
  );
  if (provider.userId) {
    await Notification.create({
      userId: provider.userId,
      type: 'new_lead',
      message: `New ${lead.need} request in ${lead.suburb}`,
      link: `/leads/${lead._id}`,
    });
  }
  return true;
}

async function main() {
  await connectDB();
  const cutoff = new Date(Date.now() - DELAY_MINUTES * 60 * 1000);
  const leads = await Lead.find({ status: 'matched', createdAt: { $lte: cutoff } })
    .sort({ createdAt: 1 })
    .limit(LEADS_PER_RUN);

  let escalatedLeads = 0;
  let notifiedProviders = 0;

  for (const lead of leads) {
    const existingMatches = await LeadMatch.find({ leadId: lead._id }).lean();
    if (existingMatches.length >= MAX_TOTAL_PROVIDERS) continue;
    if (existingMatches.some((match) => match.viewedAt || match.respondedAt || ['viewed', 'contacted'].includes(match.status))) continue;

    const excludedProviderIds = new Set(existingMatches.map((match) => String(match.providerId)));
    const providers = await Provider.find({ accountStatus: 'active', listingPaused: { $ne: true } }).lean();
    const candidates = providers
      .filter((provider) => !excludedProviderIds.has(String(provider._id)))
      .map((provider: any) => ({ provider, result: scoreMatch(lead as any, provider) }))
      .filter(({ result }) => isGenuineMatch(result))
      .sort((left, right) => right.result.score - left.result.score)
      .slice(0, Math.min(PROVIDERS_PER_RUN, MAX_TOTAL_PROVIDERS - existingMatches.length));

    let leadNotificationCount = 0;
    for (const { provider, result } of candidates) {
      try {
        await LeadMatch.create({
          leadId: lead._id,
          providerId: provider._id,
          score: result.score,
          matchReason: describeMatchReason(result),
        });
      } catch (error) {
        if ((error as { code?: number }).code === 11000) continue;
        throw error;
      }

      await notifyProvider(lead, provider);
      leadNotificationCount += 1;
      notifiedProviders += 1;
    }
    if (leadNotificationCount > 0) escalatedLeads += 1;
  }

  console.log(
    `[escalateUnviewedLeads] Notified ${notifiedProviders} provider(s) across ${escalatedLeads} lead(s); checked ${leads.length} eligible lead(s).`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('[escalateUnviewedLeads] Fatal error:', error);
  process.exit(1);
});