/**
 * Removes seed/demo/orphaned Provider records — never a real business.
 * Three specific, independent categories, each safe to match on its own:
 *
 *  1. Providers backed by a User from src/seed/seedAdminDemo.ts
 *     ("Seeding 18 providers..." — synthetic company names built from
 *     COMPANY_WORDS + a suffix like "Care"/"Home Care"/"Services"). That
 *     script's User email is always exactly
 *     `provider<N>.demo.<timestamp>@example.com.au` — a real signup can
 *     never produce that address.
 *  2. Providers with NO resolvable linked User at all. A Provider can
 *     only ever be managed by the User whose `providerId` points at it
 *     (see providersSelf.controller.ts / auth) — with no such User, it
 *     can't be logged into or managed by anyone, real or not, so it is
 *     structurally leftover data regardless of how it got there. (This
 *     is how most of production's seedAdminDemo.ts rows turned out to
 *     be found: their User side was already gone, so category 1 above
 *     — which starts from the User — never matched them.)
 *  3. The exact fixture Provider from src/seed/seed.ts — hardcoded
 *     legalEntityName "Solstice Community Care Pty Ltd" with hardcoded
 *     ABN "81442003912". Matched on BOTH fields together, so this can
 *     only ever hit that literal seed fixture, never a real business
 *     that happens to share a name.
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
const SEED_FIXTURE = { legalEntityName: 'Solstice Community Care Pty Ltd', abn: '81442003912' };

async function main() {
  const confirm = process.argv.includes('--confirm');
  await connectDB();

  const matched = new Map<string, { label: string; providerId: string; userId?: string }>();

  // 1. seedAdminDemo.ts accounts (start from the User, since that's what carries the tell-tale email).
  const demoUsers = await User.find({ role: 'provider', email: DEMO_EMAIL_RE }).select('_id providerId email').lean();
  for (const u of demoUsers) {
    if (u.providerId) matched.set(String(u.providerId), { label: `seedAdminDemo (${u.email})`, providerId: String(u.providerId), userId: String(u._id) });
  }

  // 2. Orphaned providers — no User anywhere points its providerId at this record.
  const allProviders = await Provider.find().select('_id legalEntityName tradingName abn userId').lean();
  const referencedProviderIds = new Set((await User.find({ providerId: { $exists: true } }).select('providerId').lean()).map((u) => String(u.providerId)));
  for (const p of allProviders) {
    const id = String(p._id);
    if (!referencedProviderIds.has(id) && !matched.has(id)) {
      matched.set(id, { label: `orphaned, no linked user (${p.tradingName || p.legalEntityName})`, providerId: id });
    }
  }

  // 3. The exact seed.ts fixture, matched on legalEntityName AND abn together.
  for (const p of allProviders) {
    const id = String(p._id);
    if (p.legalEntityName === SEED_FIXTURE.legalEntityName && p.abn === SEED_FIXTURE.abn && !matched.has(id)) {
      matched.set(id, { label: `seed.ts fixture (${p.tradingName})`, providerId: id, userId: p.userId ? String(p.userId) : undefined });
    }
  }

  const entries = [...matched.values()];
  console.log(`[remove-demo-providers] ${entries.length} seed/demo/orphaned provider(s) found.`);
  if (entries.length === 0) {
    console.log('[remove-demo-providers] Nothing to do.');
    process.exit(0);
  }
  for (const e of entries.slice(0, 25)) console.log(`  - ${e.label}`);
  if (entries.length > 25) console.log(`  ...and ${entries.length - 25} more`);

  if (!confirm) {
    console.log('\n[remove-demo-providers] Dry run only — nothing deleted. Re-run with --confirm to actually delete these.');
    process.exit(0);
  }

  const providerIds = entries.map((e) => e.providerId);
  const userIds = entries.map((e) => e.userId).filter((id): id is string => !!id);

  const [views, shortlists, providers, users] = await Promise.all([
    ProviderView.deleteMany({ providerId: { $in: providerIds } }),
    Shortlist.deleteMany({ providerId: { $in: providerIds } }),
    Provider.deleteMany({ _id: { $in: providerIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
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
