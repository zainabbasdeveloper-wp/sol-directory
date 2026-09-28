/**
 * Read-only report of every Provider currently in the database — no
 * writes, nothing deleted. Used to work out what's actually left after
 * removeDemoProviders.ts, since that script only matches the exact
 * seedAdminDemo.ts email pattern and other test/demo data may have been
 * created a different way.
 *
 * Usage: npx tsx src/scripts/listProviders.ts
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';

async function main() {
  await connectDB();

  const providers = await Provider.find().select('legalEntityName tradingName userId accountStatus createdAt').sort({ createdAt: 1 }).lean();
  const users = await User.find({ _id: { $in: providers.map((p) => p.userId) } }).select('_id email').lean();
  const emailById = new Map(users.map((u) => [String(u._id), u.email]));

  console.log(`${providers.length} provider(s) total:\n`);
  for (const p of providers) {
    const email = emailById.get(String(p.userId)) ?? '(no linked user)';
    console.log(`${p.createdAt?.toISOString().slice(0, 10) ?? '?'}  ${(p.tradingName || p.legalEntityName || '(no name)').padEnd(40)}  ${email}  [${p.accountStatus}]`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[list-providers] Fatal error:', err);
  process.exit(1);
});
