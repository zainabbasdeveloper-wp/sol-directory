import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { listProviders, listPublicProviders, getProviderProfile, requestProviderContact, getProviderBySlug } from '../controllers/providers.controller.js';
import { getPublicProvider, getPublicLogo, getPublicAreas, getPublicConditions } from '../controllers/providersPublic.controller.js';
import { getMyListing, putMyLogo, deleteMyLogo, getMyLogo } from '../controllers/providersSelf.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Coordinators and participants are the roles that actually search
// for providers in this app's business model (per the existing
// dashboard copy: "Search providers" for both). Admin included for
// oversight. Provider and worker are deliberately excluded — a
// provider browsing/shortlisting other providers isn't a real use
// case here, and workers have no established reason to see this at all.
const canBrowseProviders = requireRole('coordinator', 'participant', 'admin');

// Public, minimal-field search — must be declared before the /:id route below.
// Express 4 doesn't forward a rejected promise from an async handler.
const safe = (fn: (req: any, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

router.get('/public', listPublicProviders);
// Fixed paths first, or 'areas' / 'conditions' would be read as a provider slug.
router.get('/public/areas', safe(getPublicAreas));
router.get('/public/conditions', safe(getPublicConditions));
router.get('/public/:slug/logo', safe(getPublicLogo));
router.get('/public/:slug', safe(getPublicProvider));
// A provider looking after their own listing (must stay above '/:id').
router.get('/me/listing', requireAuth, safe(getMyListing));
router.get('/me/logo', requireAuth, safe(getMyLogo));
router.put('/me/logo', requireAuth, express.raw({ type: 'image/jpeg', limit: '300kb' }), safe(putMyLogo));
router.delete('/me/logo', requireAuth, safe(deleteMyLogo));
router.get('/', requireAuth, canBrowseProviders, listProviders);
router.get('/slug/:slug', requireAuth, canBrowseProviders, getProviderBySlug);
router.get('/:id', requireAuth, canBrowseProviders, getProviderProfile);
router.post('/:id/contact-request', requireAuth, canBrowseProviders, requestProviderContact);

export default router;
