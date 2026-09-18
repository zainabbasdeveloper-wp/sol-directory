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
 *      who never confirmed (or confirmed more than 7 days ago) gets
 *      paused now, dropping them from public search results.
 *   2. Send this week's prompt to every active provider (paused or
 *      not — confirming immediately un-pauses).
 */
import 'dotenv/config';
import crypto from 'crypto';
import { connectDB } from '../config/db.js';
import Provider from '../models/Provider.js';
import { EmailService } from '../services/email.service.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CONFIRM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // link stays valid for the same 7-day window

async function main() {
  await connectDB();

  const staleCutoff = new Date(Date.now() - SEVEN_DAYS_MS);
  const pauseResult = await Provider.updateMany(
    {
      accountStatus: 'active',
      listingPaused: { $ne: true },
      $or: [{ lastCapacityConfirmedAt: { $exists: false } }, { lastCapacityConfirmedAt: { $lt: staleCutoff } }],
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
    sent++;
  }

  console.log(`[weeklyCapacityCheck] Sent ${sent} confirmation prompt(s), skipped ${skippedNoEmail} provider(s) with no intake email.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[weeklyCapacityCheck] Fatal error:', err);
  process.exit(1);
});
