import Notification from '../models/Notification.js';
import { EmailService } from './email.service.js';
import { SmsService } from './sms.service.js';

const hasPaidLeadAccess = (provider: any) =>
  ['growth', 'pro'].includes(provider.plan)
  && provider.planStatus === 'active'
  && (!provider.planExpiresAt || new Date(provider.planExpiresAt) > new Date());

/**
 * Tells a member provider about an enquiry that was matched or shared with them: an email (full details only on a paid
 * plan, otherwise a privacy-safe teaser), an optional text, and an in-app notification. Never throws.
 */
export async function notifyProviderOfLead(lead: any, provider: any): Promise<void> {
  const origin = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
  const dashboardUrl = `${origin}/leads/${lead._id}`;
  try {
    if (provider.intakeEmail) {
      if (hasPaidLeadAccess(provider)) {
        await EmailService.sendProviderLeadFull(provider.intakeEmail, {
          need: lead.need, suburb: lead.suburb, requesterName: lead.requesterName, requesterEmail: lead.requesterEmail,
          requesterPhone: lead.contactPhone, careFor: lead.careFor, timeframe: lead.timeframe, fundingType: lead.fundingType,
          planManagement: lead.planManagement, additionalDetails: lead.note, dashboardUrl,
        });
      } else {
        await EmailService.sendProviderLeadTeaser(provider.intakeEmail, lead.need, lead.suburb, dashboardUrl);
      }
    }
    await SmsService.sendToProvider(provider, `SolDirectory: new ${lead.need} enquiry in ${lead.suburb}. View and respond: ${dashboardUrl}`);
    if (provider.userId) {
      await Notification.create({ userId: provider.userId, type: 'new_lead', message: `New ${lead.need} request in ${lead.suburb}`, link: `/leads/${lead._id}` });
    }
  } catch (err) {
    console.error('[leadNotify] could not notify provider:', err);
  }
}
