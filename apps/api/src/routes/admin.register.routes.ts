import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { listRegisterAdmin, getRegisterAdminSummary, getRegisterAdminDetail } from '../controllers/admin.register.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

// Express 4 doesn't forward a rejected promise from an async handler.
const safe = (fn: (req: never, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => { fn(req as never, res).catch(next); };

router.get('/summary', requireAuth, adminOnly, safe(getRegisterAdminSummary));
router.get('/:type/:slug', requireAuth, adminOnly, safe(getRegisterAdminDetail));
router.get('/', requireAuth, adminOnly, safe(listRegisterAdmin));

export default router;
