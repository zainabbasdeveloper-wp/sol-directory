import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { categoryCounts, getRegisterHub, getRegisterListing, searchRegister, submitClaimRequest } from '../controllers/register.controller.js';

const router = Router();

// Express 4 doesn't forward a rejected promise from an async handler to
// the error middleware — an unhandled DB error would hang the request.
const safe = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

// All public — register listings hold only public-register facts.
// Order matters: the fixed paths must come before /:type/:slug.
router.get('/search', safe(searchRegister));
router.get('/hub', safe(getRegisterHub));
router.get('/category-counts', safe(categoryCounts));
router.get('/:type/:slug', safe(getRegisterListing));
router.post('/:type/:slug/claim-request', safe(submitClaimRequest));

export default router;
