import 'dotenv/config';
import crypto from 'node:crypto';
import { runJob } from '../services/jobRunner.js';
import SearchAlert from '../models/SearchAlert.js';
import { buildProviderFilter } from '../controllers/providers.controller.js';
import { findProvidersPaidFirst } from '../services/providerPriority.js';
import { EmailService } from '../services/email.service.js';

async function main(): Promise<string> {
  const site = (process.env.SITE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  const alerts = await SearchAlert.find({ status: 'active' });
  let sent = 0;

  for (const alert of alerts) {
    const checkedAt = new Date();
    const filter = buildProviderFilter({ service: alert.service, suburb: alert.suburb, q: alert.query });
    (filter as any).updatedAt = { $gt: alert.lastCheckedAt ?? alert.verifiedAt ?? alert.createdAt };
    const providers = await findProvidersPaidFirst<any>(filter, 'tradingName legalEntityName slug registrationGroups', { limit: 10 });
    if (providers.length > 0) {
      const searchParams = new URLSearchParams();
      if (alert.service) searchParams.set('service', alert.service);
      if (alert.suburb) searchParams.set('suburb', alert.suburb);
      if (alert.query) searchParams.set('q', alert.query);
      const rawUnsubscribe = crypto.randomBytes(32).toString('hex');
      alert.unsubscribeTokenHash = crypto.createHash('sha256').update(rawUnsubscribe).digest('hex');
      const delivered = await EmailService.sendSearchAlertDigest(alert.email, {
        service: alert.service,
        suburb: alert.suburb,
        query: alert.query,
        providers: providers.map((provider) => ({
          name: provider.tradingName || provider.legalEntityName,
          url: `${site}/directory/${provider.slug}`,
          supports: (provider.registrationGroups ?? []).slice(0, 3),
        })),
        searchUrl: `${site}/find-a-provider?${searchParams.toString()}`,
        unsubscribeUrl: `${site}/api/search-alerts/unsubscribe?token=${rawUnsubscribe}`,
      });
      if (!delivered) continue;
      sent += 1;
    }
    alert.lastCheckedAt = checkedAt;
    await alert.save();
  }

  return `Sent ${sent} alert email(s); checked ${alerts.length} active alert(s).`;
}

void runJob('search-alerts', main);