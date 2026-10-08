/**
 * The daily follow-up job. Run it once a day (see the cron line in the project notes):
 *   - weekly "your matches" emails to people whose enquiry nobody has taken up (up to 4, 7 days apart);
 *   - one reminder to each provider with matched enquiries left unopened for 48 hours.
 * Safe to run more often or twice by mistake: every email claims its "already sent" marker before sending.
 *
 * Usage:
 *   npm run job:lead-followups -w apps/api
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { sendProviderReminders, sendWeeklyMatchDigests } from '../services/leadFollowUp.service.js';

async function main() {
  await connectDB();
  const digests = await sendWeeklyMatchDigests();
  console.log(`[lead-followups] Weekly matches: checked ${digests.checked} enquiries, sent ${digests.sent}.`);
  const reminders = await sendProviderReminders();
  console.log(`[lead-followups] Provider reminders: ${reminders.enquiries} waiting enquiries across ${reminders.providers} provider(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[lead-followups] Fatal error:', err);
  process.exit(1);
});
