/**
 * Sets every worker's stored rating / reviewCount from their APPROVED reviews
 * (zero when they have none).
 *
 *   npm run recompute:worker-ratings
 *
 * Why: before worker reviews existed, these two fields could hold values
 * that never came from a real review — the demo seeds (src/seed) write
 * random ratings, and nothing else ever updated them. Run this once on any
 * database that has seed data so the gated directory's ratings and its
 * "minimum rating" filter reflect real reviews only. (The public pages
 * already compute from reviews directly and never read these fields.)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import { ratingsFor } from '../controllers/workersReviews.controller.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const ids = (await Worker.find().select('_id').lean()).map((w) => w._id as mongoose.Types.ObjectId);
  const ratings = await ratingsFor(ids);

  let changed = 0;
  for (const id of ids) {
    const r = ratings.get(String(id)) ?? { rating: 0, count: 0 };
    const res = await Worker.updateOne({ _id: id, $or: [{ rating: { $ne: r.rating } }, { reviewCount: { $ne: r.count } }] }, { $set: { rating: r.rating, reviewCount: r.count } });
    changed += res.modifiedCount;
  }
  console.log(`[worker-ratings] ${ids.length} workers checked, ${changed} updated.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
