/**
 * Removes the provider accounts created by src/seed/seedAdminDemo.ts
 * ("Seeding 18 providers..." — synthetic company names built from
 * COMPANY_WORDS + a suffix like "Care"/"Home Care"/"Services"). That
 * script backs every demo provider with a throwaway User whose email is
 * always exactly `provider<N>.demo.<timestamp>@example.com.au` — a real
 * signup can never produce that address, so matching on it is a safe,
 * specific way to find only the seeded rows and never a real provider.
 *
 * Also deletes each match's ProviderView and Shortlist rows, so nothing
 * is left pointing at a provider that no longer exists.
 *
 * Usage:
 *   npx tsx src/scripts/removeDemoProviders.ts            # report only (default — nothing is deleted)
 *   npx tsx src/scripts/removeDemoProviders.ts --confirm   # actually delete
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import ProviderView from '../models/ProviderView.js';
import Shortlist from '../models/Shortlist.js';

const DEMO_EMAIL_RE = /^provider\d+\.demo\.\d+@example\.com\.au$/i;

async function main() {
  const confirm = process.argv.includes('--confirm');
  await connectDB();

  const demoUsers = await User.find({ role: 'provider', email: DEMO_EMAIL_RE }).select('_id providerId email').lean();
  const providerIds = demoUsers.map((u) => u.providerId).filter(Boolean);

  console.log(`[remove-demo-providers] ${demoUsers.length} demo provider account(s) found (matching the seedAdminDemo.ts email pattern).`);
  if (demoUsers.length === 0) {
    console.log('[remove-demo-providers] Nothing to do.');
    process.exit(0);
  }
  for (const u of demoUsers.slice(0, 10)) console.log(`  - ${u.email}`);
  if (demoUsers.length > 10) console.log(`  ...and ${demoUsers.length - 10} more`);

  if (!confirm) {
    console.log('\n[remove-demo-providers] Dry run only — nothing deleted. Re-run with --confirm to actually delete these.');
    process.exit(0);
  }

  const [views, shortlists, providers, users] = await Promise.all([
    ProviderView.deleteMany({ providerId: { $in: providerIds } }),
    Shortlist.deleteMany({ providerId: { $in: providerIds } }),
    Provider.deleteMany({ _id: { $in: providerIds } }),
    User.deleteMany({ _id: { $in: demoUsers.map((u) => u._id) } }),
  ]);

  console.log(
    `\n[remove-demo-providers] Deleted ${providers.deletedCount} provider(s), ${users.deletedCount} user account(s), ` +
    `${views.deletedCount} view record(s), ${shortlists.deletedCount} shortlist(s).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[remove-demo-providers] Fatal error:', err);
  process.exit(1);
});
