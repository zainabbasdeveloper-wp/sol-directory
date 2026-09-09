import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Service from '../models/Service.js';

// The one real endpoint every service-selection UI in the app should
// call — WorkerDirectory's filter, Onboarding's registration-groups
// step, Signup, provider service selection, etc. Returns only active
// services, optionally narrowed by role so a page can ask for just
// what's relevant to it.
export async function listActiveServices(req: AuthedRequest, res: Response) {
  const filter: Record<string, unknown> = { active: true };
  if (req.query.role === 'provider' || req.query.role === 'worker') {
    filter.applicableRoles = req.query.role;
  }

  const items = await Service.find(filter).sort({ category: 1, name: 1 }).select('name category description applicableFunding').lean();
  res.json({
    items: items.map((s: any) => ({
      id: String(s._id),
      name: s.name,
      category: s.category,
      description: s.description ?? '',
      applicableFunding: s.applicableFunding ?? [],
    })),
  });
}
