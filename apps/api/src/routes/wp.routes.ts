import { Router } from 'express';

const router = Router();
const WP_GRAPHQL_ENDPOINT = process.env.WORDPRESS_GRAPHQL_URL;
const WP_REST_BASE = process.env.WORDPRESS_URL; // e.g. http://46.250.242.208:8080

router.post('/graphql', async (req, res) => {
  if (!WP_GRAPHQL_ENDPOINT) {
    return res.status(503).json({ error: 'WORDPRESS_GRAPHQL_URL is not set — see .env.example' });
  }
  try {
    const wpRes = await fetch(WP_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await wpRes.json();
    res.status(wpRes.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Could not reach the WordPress GraphQL endpoint', detail: err.message });
  }
});

/**
 * REST proxy — added to permanently resolve the cross-origin problem
 * between the React app (port 80) and WordPress (port 8080), the
 * exact issue this whole conversation has been chasing. The browser
 * only ever talks to THIS API (already same-origin, already proven
 * working), which then fetches WordPress server-side — a server-to-
 * server request has no concept of CORS at all, since CORS is
 * exclusively a browser-enforced restriction.
 *
 * This is a better fix than any amount of WordPress-side CORS header
 * configuration, because it removes the cross-origin request from
 * existing in the first place, rather than trying to correctly
 * permit it.
 *
 * Matches any /wp-json/... path — the frontend calls
 * /api/wp/rest/wp-json/wp/v2/services?slug=test and this forwards
 * it, verbatim, to WORDPRESS_URL/wp-json/wp/v2/services?slug=test.
 */
router.get(/^\/rest\/(.*)$/, async (req, res) => {
  if (!WP_REST_BASE) {
    return res.status(503).json({ error: 'WORDPRESS_URL is not set — see .env.example' });
  }
  try {
    const path = req.params[0];
    const qs = req.originalUrl.split('?')[1];
    const url = `${WP_REST_BASE.replace(/\/$/, '')}/${path}${qs ? `?${qs}` : ''}`;
    const wpRes = await fetch(url);
    const data = await wpRes.text(); // pass through raw — could be JSON or an error page, don't assume
    res.status(wpRes.status).set('Content-Type', wpRes.headers.get('content-type') ?? 'application/json').send(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Could not reach the WordPress REST API', detail: err.message });
  }
});

export default router;
