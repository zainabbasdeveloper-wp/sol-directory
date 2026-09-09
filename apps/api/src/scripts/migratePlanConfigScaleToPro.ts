import 'dotenv/config';
import mongoose from 'mongoose';

// One-off migration for the Provider.plan rename ('scale' -> 'pro').
// PlanConfig documents are keyed by plan name and store the
// lead-unlock quota for that tier — renaming the Provider enum
// without this migration means unlockLead's
// `PlanConfig.findOne({ key: provider.plan })` finds nothing for any
// provider on the new 'pro' tier, quota falls back to 0, and they
// get a false "upgrade your plan" rejection even on the top tier.
//
// This renames the EXISTING 'scale' document to 'pro' rather than
// creating a new one with a guessed quota value — whatever quota
// 'scale' already had is preserved exactly, nothing invented.
//
// Safe to run more than once: if no 'scale' document exists (already
// migrated, or never existed), it does nothing and says so clearly.
//
// Run with: npx tsx src/scripts/migratePlanConfigScaleToPro.ts

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;

  const existing = await db.collection('planconfigs').findOne({ key: 'scale' });
  if (!existing) {
    const alreadyPro = await db.collection('planconfigs').findOne({ key: 'pro' });
    if (alreadyPro) {
      console.log('No "scale" PlanConfig found, but "pro" already exists — nothing to do. Migration already applied or never needed.');
    } else {
      console.log('WARNING: No "scale" or "pro" PlanConfig document found at all. If providers on the "pro" plan exist, unlockLead will currently reject them with a false "upgrade your plan" error until a PlanConfig document with key "pro" is created manually.');
    }
    process.exit(0);
  }

  const result = await db.collection('planconfigs').updateOne({ key: 'scale' }, { $set: { key: 'pro' } });
  console.log(`Renamed PlanConfig 'scale' -> 'pro'. Quota preserved as-is: ${existing.quota === null ? 'unlimited' : existing.quota}. Matched: ${result.matchedCount}, modified: ${result.modifiedCount}.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
