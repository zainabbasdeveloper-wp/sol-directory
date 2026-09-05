import { Router } from 'express';
import { listProviders, getProviderProfile, requestProviderContact } from '../controllers/providers.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Coordinators and participants are the roles that actually search
// for providers in this app's business model (per the existing
// dashboard copy: "Search providers" for both). Admin included for
// oversight. Provider and worker are deliberately excluded — a
// provider browsing/shortlisting other providers isn't a real use
// case here, and workers have no established reason to see this at all.
const canBrowseProviders = requireRole('coordinator', 'participant', 'admin');

router.get('/', requireAuth, canBrowseProviders, listProviders);
router.get('/:id', requireAuth, canBrowseProviders, getProviderProfile);
router.post('/:id/contact-request', requireAuth, canBrowseProviders, requestProviderContact);

export default router;
