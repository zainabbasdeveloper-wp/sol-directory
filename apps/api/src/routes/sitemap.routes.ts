import { Router } from 'express';
import { getSitemap } from '../controllers/sitemap.controller.js';

const router = Router();
router.get('/', getSitemap); // public — sitemaps are meant to be publicly fetchable by crawlers, no auth
export default router;
