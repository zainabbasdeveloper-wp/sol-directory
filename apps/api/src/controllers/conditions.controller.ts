import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Condition from '../models/Condition.js';

// Any authenticated role can read this — participants specifying
// requirements, providers/workers declaring experience, all need the
// same active catalogue.
export async function listActiveConditions(req: AuthedRequest, res: Response) {
  const items = await Condition.find({ active: true }).sort({ category: 1, name: 1 }).select('name category').lean();
  res.json({ items: items.map((c: any) => ({ id: String(c._id), name: c.name, category: c.category })) });
}
