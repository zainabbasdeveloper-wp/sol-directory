import type { Request, Response } from 'express';
import ContentRevalidation from '../models/ContentRevalidation.js';
import { pullProviderLogoFromWordPress } from '../services/wordpressSync.service.js';

// WordPress calls this (from a small hook in the custom plugin, on
// save_post/transition_post_status) whenever content changes.
// Verified by a shared secret — WEBHOOK_SECRET — since this endpoint
// has no other authentication and must not let anyone bump the
// revalidation timestamp arbitrarily.
export async function receiveWordPressWebhook(req: Request, res: Response) {
  const secret = req.headers['x-webhook-secret'];
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }

  // Single shared document — there's exactly one "when did content
  // last change" timestamp, not one per content item. A page-level
  // cache would warrant per-item invalidation; this app's simple
  // client-side session cache only needs to know "is anything I have
  // cached now stale," which a single global timestamp answers.
  await ContentRevalidation.findOneAndUpdate({}, { lastChangedAt: new Date() }, { upsert: true });

  // The one WP -> Mongo sync direction: a provider post's logo
  // (featured image) can be managed directly in wp-admin, and needs
  // to flow back onto the matching Provider record. Every other
  // provider field goes the other way (see wordpressSync.service.ts)
  // and is intentionally ignored here — editing them in WP has no
  // effect, they'd just get overwritten on the provider's next sync.
  // Fire-and-forget: a failed pull must never fail this webhook
  // response (WordPress only waits 2s and doesn't care about the body).
  const { postId, postType } = req.body as { postId?: number; postType?: string };
  if (postType === 'provider' && postId) {
    pullProviderLogoFromWordPress(postId).catch(() => {});
  }

  res.json({ received: true });
}

// Public — the frontend cache checks this before trusting anything
// it already has. No secret needed to READ a timestamp; only writing
// it is protected.
export async function getLastChanged(req: Request, res: Response) {
  const doc = await ContentRevalidation.findOne().lean();
  res.json({ lastChangedAt: doc?.lastChangedAt ?? null });
}
