/**
 * Weekly provider capacity check — developer brief, Phase 3: "Weekly
 * capacity confirmation: SMS/email every Monday, one-tap confirm.
 * Unconfirmed after 7 days = listing marked paused and dropped from
 * results." Meant to run once a week (e.g. a Monday cron entry):
 *
 *   0 8 * * 1 cd /path/to/apps/api && npx tsx src/scripts/weeklyCapacityCheck.ts
 *
 * No job scheduler/queue exists anywhere in this codebase to hook
 * into (confirmed during the referral-marketplace audit this session
 * — same conclusion as Dashboard.tsx's own polling comment), so this
 * follows the existing standalone-script convention (seed.ts,
 * importScrapedProviders.ts) rather than inventing new infrastructure.
 *
 * Two passes, in order, matching the brief's cadence exactly:
 *   1. Enforce last week's deadline — any active, unpaused provider
 *      who was PROMPTED and let the link expire without confirming gets
 *      paused now, dropping them from public search results. A provider
 *      who has never been prompted (brand new signup, fresh import) is
 *      NOT paused — "unconfirmed after 7 days" only means something once
 *      they've actually been asked. (Confirming clears the token fields,
 *      so "token set and expired" is exactly "asked, never answered".)
 *   2. Send this week's prompt to every active provider (paused or
 *      not — confirming immediately un-pauses).
 */
import 'dotenv/config';
import crypto from 'crypto';
import { connectDB } from '../config/db.js';
import Provider from '../models/Provider.js';
import { EmailService } from '../services/email.service.js';
import { SmsService } from '../services/sms.service.js';

const CONFIRM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // link stays valid for the same 7-day window

async function main() {
  await connectDB();

  const pauseResult = await Provider.updateMany(
    {
      accountStatus: 'active',
      listingPaused: { $ne: true },
      capacityConfirmExpiresAt: { $lt: new Date() },
    },
    { $set: { listingPaused: true } }
  );
  console.log(`[weeklyCapacityCheck] Paused ${pauseResult.modifiedCount} unconfirmed listing(s).`);

  const providers = await Provider.find({ accountStatus: 'active' });
  const frontendOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  let sent = 0;
  let skippedNoEmail = 0;
  for (const provider of providers) {
    if (!provider.intakeEmail) { skippedNoEmail++; continue; }

    const rawToken = crypto.randomBytes(32).toString('hex');
    provider.capacityConfirmTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    provider.capacityConfirmExpiresAt = new Date(Date.now() + CONFIRM_WINDOW_MS);
    await provider.save();

    const confirmUrl = `${frontendOrigin}/confirm-capacity?token=${rawToken}`;
    const providerName = provider.tradingName || provider.legalEntityName || 'there';
    await EmailService.sendCapacityConfirmation(provider.intakeEmail, providerName, confirmUrl);
    // Brief: "SMS/email every Monday" — opted-in providers also get a text
    // with the same one-tap link (no-op unless Twilio is configured).
    await SmsService.sendToProvider(provider, `SolDirectory: still taking referrals this week? Confirm in one tap: ${confirmUrl}`);
    sent++;
  }

  console.log(`[weeklyCapacityCheck] Sent ${sent} confirmation prompt(s), skipped ${skippedNoEmail} provider(s) with no intake email.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[weeklyCapacityCheck] Fatal error:', err);
  process.exit(1);
});
