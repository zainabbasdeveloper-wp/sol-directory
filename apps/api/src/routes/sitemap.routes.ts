import { Router } from 'express';
import { getSitemap } from '../controllers/sitemap.controller.js';

const router = Router();
// Public: sitemaps are meant to be fetchable by crawlers, no auth.
// This is the sitemap INDEX; the parts (/sitemap-pages.xml,
// /sitemap-register-N.xml) are mounted in index.ts.
router.get('/', (req, res, next) => { getSitemap(req, res).catch(next); });
export default router;
