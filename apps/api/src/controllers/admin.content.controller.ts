import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import SourceUpdate, { type SourceUpdateStatus } from '../models/SourceUpdate.js';
import JobRun from '../models/JobRun.js';
import { scanSources, classify } from '../services/officialSources.js';
import {
  MAX_PER_DAY, PUBLISH_HOUR, checkReadiness, createBrief, getPost, nextSlot, publishUpdate, syncWordpressStates, wordpressConfigured,
} from '../services/blogAutomation.js';

const STATUSES: SourceUpdateStatus[] = ['new', 'brief', 'scheduled', 'published', 'dismissed'];

function editUrl(postId?: number): string | null {
  const base = (process.env.WORDPRESS_ADMIN_URL || process.env.WORDPRESS_URL || '').replace(/\/$/, '');
  return postId && base ? `${base}/wp-admin/post.php?post=${postId}&action=edit` : null;
}

function view(d: any) {
  return {
    editUrl: editUrl(d.wpPostId),
    id: String(d._id),
    source: d.source,
    url: d.url,
    title: d.title,
    categories: d.categories,
    teaser: d.teaser ?? null,
    publishedAt: d.publishedAt ?? null,
    headings: d.headings,
    wordCount: d.wordCount,
    topics: d.topics,
    priority: d.priority,
    firstSeenAt: d.firstSeenAt,
    lastChangedAt: d.lastChangedAt ?? null,
    changeCount: d.changeCount,
    needsRecheck: d.needsRecheck,
    status: d.status,
    wpPostId: d.wpPostId ?? null,
    wpPostUrl: d.wpPostUrl ?? null,
    scheduledFor: d.scheduledFor ?? null,
    publishedOnAt: d.publishedOnAt ?? null,
    dismissedReason: d.dismissedReason ?? null,
  };
}

function wpErrorStatus(err: unknown): string {
  return err instanceof Error ? err.message : 'WordPress request failed.';
}

export async function getContentOverview(_req: AuthedRequest, res: Response) {
  const synced = await syncWordpressStates().catch(() => 0);
  const grouped = await SourceUpdate.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  const counts: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const g of grouped) counts[g._id] = g.n;
  const recheck = await SourceUpdate.countDocuments({ needsRecheck: true });
  const lastRun = await JobRun.findOne({ name: 'ndis-news-monitor' }).sort({ startedAt: -1 }).lean();
  res.json({
    wordpressConnected: wordpressConfigured(),
    counts,
    needsRecheck: recheck,
    syncedFromWordpress: synced,
    lastRun: lastRun ? { at: lastRun.startedAt, status: lastRun.status, summary: lastRun.summary ?? lastRun.error ?? '' } : null,
    nextSlot: await nextSlot().catch(() => null),
    settings: { publishHour: PUBLISH_HOUR, maxPerDay: MAX_PER_DAY, timezone: 'Australia/Sydney' },
  });
}

export async function listUpdates(req: AuthedRequest, res: Response) {
  const status = String(req.query.status ?? '');
  const filter: Record<string, unknown> = {};
  if (status === 'recheck') filter.needsRecheck = true;
  else if (STATUSES.includes(status as SourceUpdateStatus)) filter.status = status;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const [items, total] = await Promise.all([
    SourceUpdate.find(filter).sort({ priority: -1, publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SourceUpdate.countDocuments(filter),
  ]);
  res.json({
    items: items.map((d) => ({
      ...view(d),
      related: classify({ title: d.title, categories: d.categories, headings: d.headings, kind: d.source === 'ndis-news' ? 'news' : 'page', publishedAt: d.publishedAt }).related,
    })),
    page,
    total,
    hasMore: page * limit < total,
  });
}

export async function runScan(_req: AuthedRequest, res: Response) {
  try {
    const result = await scanSources();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: `The scan could not finish: ${(err as Error).message}` });
  }
}

export async function briefUpdate(req: AuthedRequest, res: Response) {
  if (!wordpressConfigured()) { res.status(409).json({ error: 'WordPress is not connected, so a draft cannot be created.' }); return; }
  const doc = await SourceUpdate.findById(req.params.id);
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
  try {
    const out = await createBrief(doc);
    res.json({ ...view(doc), created: out.created, adopted: out.adopted });
  } catch (err) {
    res.status(502).json({ error: wpErrorStatus(err) });
  }
}

export async function checkUpdate(req: AuthedRequest, res: Response) {
  const doc = await SourceUpdate.findById(req.params.id);
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
  if (!doc.wpPostId) { res.json({ ready: false, issues: ['There is no WordPress draft for this item yet.'], words: 0 }); return; }
  try {
    const post = await getPost(doc.wpPostId);
    const issues = checkReadiness(post, doc);
    if (doc.needsRecheck) issues.push('The official page changed after this was briefed. Re-read it and update the post.');
    res.json({ ready: issues.length === 0, issues, editUrl: null });
  } catch (err) {
    res.status(502).json({ error: wpErrorStatus(err) });
  }
}

export async function publishItem(req: AuthedRequest, res: Response) {
  if (!wordpressConfigured()) { res.status(409).json({ error: 'WordPress is not connected.' }); return; }
  const doc = await SourceUpdate.findById(req.params.id);
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
  const mode = req.body?.mode === 'now' ? 'now' : 'schedule';
  let at: Date | undefined;
  if (req.body?.at) {
    at = new Date(String(req.body.at));
    if (Number.isNaN(at.getTime())) { res.status(400).json({ error: 'That date is not valid.' }); return; }
  }
  try {
    const out = await publishUpdate(doc, mode, at);
    if (!out.ok) { res.status(422).json({ error: 'Not ready to publish yet.', issues: out.issues }); return; }
    res.json({ ...view(doc), outcome: out.status });
  } catch (err) {
    res.status(502).json({ error: wpErrorStatus(err) });
  }
}

export async function dismissItem(req: AuthedRequest, res: Response) {
  const reason = String(req.body?.reason ?? '').slice(0, 200) || undefined;
  const doc = await SourceUpdate.findByIdAndUpdate(req.params.id, { status: 'dismissed', dismissedReason: reason }, { new: true });
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(view(doc));
}

export async function restoreItem(req: AuthedRequest, res: Response) {
  const doc = await SourceUpdate.findById(req.params.id);
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
  if (doc.status === 'dismissed') { doc.status = doc.wpPostId ? 'brief' : 'new'; doc.dismissedReason = undefined; }
  await doc.save();
  res.json(view(doc));
}

export async function markRechecked(req: AuthedRequest, res: Response) {
  const doc = await SourceUpdate.findByIdAndUpdate(req.params.id, { needsRecheck: false }, { new: true });
  if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(view(doc));
}
