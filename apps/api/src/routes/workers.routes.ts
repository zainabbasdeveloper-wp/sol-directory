import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { listWorkers, getWorkerProfile, requestContact } from '../controllers/workers.controller.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';

const router = Router();

// Worker directory access is now restricted to:
//   - admin (always)
//   - provider, but ONLY on the 'pro' plan
// Coordinator and participant no longer have access at all — this
// reverses the earlier "coordinator/participant/admin can browse
// workers" rule per a direct business-requirement change. Worker
// role was already excluded before and stays excluded.
//
// This can't be expressed with the plain requireRole(...role list)
// helper since it depends on plan, not just role, so it's a small
// dedicated middleware instead.
async function requireAdminOrProProvider(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) { res.status(401).json({ error: 'Missing bearer token' }); return; }
  if (req.user.role === 'admin') { next(); return; }
  if (req.user.role === 'provider') {
    const provider = await Provider.findOne({ userId: req.user.id }).select('plan').lean();
    if (provider?.plan === 'pro') { next(); return; }
  }
  res.status(403).json({ error: 'Not authorized for this action' });
}

router.get('/', requireAuth, requireAdminOrProProvider, listWorkers);
router.get('/:id', requireAuth, requireAdminOrProProvider, getWorkerProfile);
router.post('/:id/contact-request', requireAuth, requireAdminOrProProvider, requestContact);
export default router;
