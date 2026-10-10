import 'dotenv/config';
import { runJob } from '../services/jobRunner.js';
import { scanSources } from '../services/officialSources.js';
import { createBrief, syncWordpressStates, wordpressConfigured } from '../services/blogAutomation.js';
import SourceUpdate from '../models/SourceUpdate.js';

/**
 * Official-source monitor. Reads the NDIS news and recently-updated pages (politely, within robots.txt), records new and
 * changed items, then creates private WordPress briefs for the most worthwhile new ones. It never publishes and never
 * copies article text: a person writes each post. `--dry-run` reads the sources but changes nothing.
 */
const dryRun = process.argv.includes('--dry-run');
const MAX_BRIEFS = Math.max(0, Number(process.env.NDIS_NEWS_MONITOR_MAX_DRAFTS) || 6);
const MIN_PRIORITY = Number(process.env.NDIS_NEWS_MIN_PRIORITY) || 45;
const AUTO_BRIEF = process.env.NDIS_NEWS_AUTO_BRIEF !== 'false';
const MAX_AGE_DAYS = 60;

runJob('ndis-news-monitor', async () => {
  const scan = await scanSources({ dryRun });
  const parts = [`${scan.discovered} item(s) seen, ${scan.added} new, ${scan.changed} changed`];
  if (scan.enriched) parts.push(`${scan.enriched} read in full`);
  if (scan.rechecked) parts.push(`${scan.rechecked} existing re-read`);
  if (scan.blocked) parts.push('the site refused automated requests, so the crawler backed off');

  if (!dryRun && wordpressConfigured()) {
    const synced = await syncWordpressStates();
    if (synced) parts.push(`${synced} post status(es) updated from WordPress`);
    if (AUTO_BRIEF && MAX_BRIEFS > 0) {
      const since = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000);
      const candidates = await SourceUpdate.find({
        status: 'new',
        priority: { $gte: MIN_PRIORITY },
        $or: [{ publishedAt: { $gte: since } }, { publishedAt: { $exists: false } }],
      }).sort({ priority: -1, publishedAt: -1 }).limit(MAX_BRIEFS);
      let created = 0;
      let adopted = 0;
      for (const doc of candidates) {
        try {
          const out = await createBrief(doc);
          if (out.created) created += 1; else adopted += 1;
        } catch (err) {
          scan.problems.push(`brief for ${doc.url}: ${(err as Error).message}`);
        }
      }
      parts.push(`${created} brief(s) created${adopted ? `, ${adopted} existing draft(s) linked` : ''}`);
    }
  } else if (!dryRun && !wordpressConfigured()) {
    parts.push('WordPress not connected, so no briefs were created');
  }
  if (scan.problems.length) parts.push(`${scan.problems.length} problem(s): ${scan.problems.slice(0, 2).join(' | ').slice(0, 220)}`);
  return `${dryRun ? 'Dry run: ' : ''}${parts.join('; ')}.`;
});
