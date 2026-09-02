import { Router } from 'express';

const router = Router();
const WP_ENDPOINT = process.env.WORDPRESS_GRAPHQL_URL;

router.post('/graphql', async (req, res) => {
  if (!WP_ENDPOINT) {
    return res.status(503).json({ error: 'WORDPRESS_GRAPHQL_URL is not set — see .env.example' });
  }
  try {
    const wpRes = await fetch(WP_ENDPOINT, {
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

export default router;
