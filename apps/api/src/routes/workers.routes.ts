import express, { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { listWorkers, getWorkerProfile, requestContact } from '../controllers/workers.controller.js';
import { listPublicWorkers, getPublicWorker, getPublicWorkerPhoto } from '../controllers/workersPublic.controller.js';
import { getMyWorker, updateMyWorker, putMyPhoto, deleteMyPhoto, getMyPhoto } from '../controllers/workersSelf.controller.js';
import { getPublicWorkerReviews, getWorkerReviewsForOrg, submitWorkerReview, getMyReviews } from '../controllers/workersReviews.controller.js';
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
    // SECURITY: accountStatus filter added — see utils/getActiveProvider.ts
    // for full context (found during a security audit). Without this,
    // a suspended provider on the 'pro' plan kept full access to the
    // worker directory for as long as their JWT stayed valid (up to
    // 7 days), since only plan was checked, never account status.
    const provider = await Provider.findOne({ userId: req.user.id, accountStatus: 'active' }).select('plan').lean();
    if (provider?.plan === 'pro') { next(); return; }
  }
  res.status(403).json({ error: 'Not authorized for this action' });
}

// Express 4 doesn't forward a rejected promise from an async handler.
const safe = (fn: (req: any, res: Response) => Promise<unknown>) =>
  (req: any, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

// Public opt-in listings (no login) and a worker's own profile. These
// fixed paths must stay ABOVE the '/:id' routes below, or '/me' and
// '/public' would be read as worker ids.
router.get('/public', safe(listPublicWorkers));
router.get('/public/:slug', safe(getPublicWorker));
router.get('/public/:slug/photo', safe(getPublicWorkerPhoto));
router.get('/public/:slug/reviews', safe(getPublicWorkerReviews));
router.get('/me', requireAuth, safe(getMyWorker));
router.get('/me/reviews', requireAuth, safe(getMyReviews));
router.put('/me', requireAuth, safe(updateMyWorker));
router.get('/me/photo', requireAuth, safe(getMyPhoto));
// The browser sends the cropped JPEG as the raw request body.
router.put('/me/photo', requireAuth, express.raw({ type: 'image/jpeg', limit: '300kb' }), safe(putMyPhoto));
router.delete('/me/photo', requireAuth, safe(deleteMyPhoto));

router.get('/', requireAuth, requireAdminOrProProvider, listWorkers);
router.get('/:id', requireAuth, requireAdminOrProProvider, getWorkerProfile);
// Reviews: organisations read them and (after contacting the worker) write one. Only admin-approved reviews are ever shown.
router.get('/:id/reviews', requireAuth, requireAdminOrProProvider, safe(getWorkerReviewsForOrg));
router.post('/:id/reviews', requireAuth, safe(submitWorkerReview));
router.post('/:id/contact-request', requireAuth, requireAdminOrProProvider, requestContact);
export default router;
