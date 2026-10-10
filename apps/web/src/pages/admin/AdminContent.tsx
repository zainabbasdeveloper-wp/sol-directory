import { useCallback, useEffect, useState } from 'react';
import {
  ContentError, checkReady, createBrief, dismiss, getOverview, listUpdates, markRechecked, publish, restore, scanNow,
  type ContentOverview, type ContentStatus, type ContentUpdate,
} from '../../api/adminContent';
import { timeAgo } from './adminFormat';
import './AdminDashboard.css';
import './AdminOperations.css';
import './AdminContent.css';

type Tab = ContentStatus | 'recheck';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'new', label: 'To review', hint: 'Found on an official source, nothing started yet' },
  { id: 'brief', label: 'Being written', hint: 'A private WordPress draft with an outline exists' },
  { id: 'scheduled', label: 'Scheduled', hint: 'Finished and waiting for its publishing slot' },
  { id: 'published', label: 'Published', hint: 'Live on the blog' },
  { id: 'recheck', label: 'Source changed', hint: 'The official page changed after we wrote about it' },
  { id: 'dismissed', label: 'Dismissed', hint: 'Not worth a post' },
];

const TOPIC_LABEL: Record<string, string> = {
  pricing: 'Pricing', plans: 'Plans and budgets', providers: 'Providers', legislation: 'Laws and rules', housing: 'Housing',
  'support-coordination': 'Support coordination', workers: 'Support workers', enforcement: 'Fraud and enforcement', 'system-notices': 'System notices',
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' }) : '');
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date');

function Item({ item, wordpress, onChanged }: { item: ContentUpdate; wordpress: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(label: string, fn: () => Promise<string | void>) {
    setBusy(label);
    setNote(null);
    setIssues([]);
    try {
      const text = await fn();
      if (text) setNote({ ok: true, text });
      onChanged();
    } catch (err) {
      if (err instanceof ContentError && err.issues.length) setIssues(err.issues);
      setNote({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy('');
    }
  }

  const priorityClass = item.priority >= 70 ? 'ac-pri-high' : item.priority >= 45 ? 'ac-pri-mid' : 'ac-pri-low';

  return (
    <li className="ad-panel ac-item">
      <button type="button" className="ac-row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`ac-pri ${priorityClass}`} title="How worth writing about this looks (0 to 100)">{item.priority}</span>
        <span className="ac-main">
          <strong>{item.title}</strong>
          <small>
            {item.source === 'ndis-news' ? 'NDIS news' : 'NDIS page update'} · {day(item.publishedAt)}
            {item.categories.length > 0 && ` · ${item.categories.join(', ')}`}
          </small>
        </span>
        <span className="ac-badges">
          {item.needsRecheck && <span className="ao-pill ao-pill-failed">Source changed</span>}
          {item.status === 'scheduled' && <span className="ao-pill ao-pill-running">{when(item.scheduledFor)}</span>}
          {item.status === 'published' && <span className="ao-pill ao-pill-ok">Live</span>}
          {item.status === 'brief' && <span className="ao-pill ao-pill-overdue">Draft</span>}
        </span>
      </button>

      {open && (
        <div className="ac-detail">
          <div className="ac-cols">
            <div>
              <h4>What the official page covers</h4>
              {item.headings.length > 0 ? (
                <ul className="ac-list">{item.headings.map((h) => <li key={h}>{h}</li>)}</ul>
              ) : <p className="ad-empty-note">No section headings. About {item.wordCount} words.</p>}
              {item.topics.length > 0 && (
                <p className="ac-topics">{item.topics.map((t) => <span key={t} className="ao-pill ao-pill-never_run">{TOPIC_LABEL[t] ?? t}</span>)}</p>
              )}
              {item.teaser && <p className="ao-dim ac-teaser">Official summary (for you only, never published): {item.teaser}</p>}
            </div>
            <div>
              <h4>Links to include</h4>
              <ul className="ac-list">
                <li><a href={item.url} target="_blank" rel="noopener noreferrer">The official page</a> (cite it)</li>
                {(item.related ?? []).map((r) => <li key={r.path}>{r.label} <span className="ao-mono">{r.path}</span></li>)}
              </ul>
              {item.lastChangedAt && <p className="ao-dim">The official page last changed {timeAgo(item.lastChangedAt)}{item.changeCount > 1 ? ` (${item.changeCount} changes seen)` : ''}.</p>}
              {item.dismissedReason && <p className="ao-dim">Dismissed: {item.dismissedReason}</p>}
            </div>
          </div>

          <div className="ac-actions">
            {item.status === 'new' && (
              <>
                <button type="button" className="ao-btn ac-primary" disabled={!wordpress || busy !== ''} onClick={() => run('brief', async () => { await createBrief(item.id); return 'Draft created in WordPress. Open it to write the post.'; })}>
                  {busy === 'brief' ? 'Creating…' : 'Create WordPress draft'}
                </button>
                <button type="button" className="ao-btn" disabled={busy !== ''} onClick={() => run('dismiss', async () => { await dismiss(item.id, 'Not worth a post'); })}>Not worth a post</button>
              </>
            )}

            {(item.status === 'brief' || item.status === 'scheduled') && item.editUrl && (
              <a className="ao-btn ac-link" href={item.editUrl} target="_blank" rel="noopener noreferrer">Open in WordPress</a>
            )}
            {item.status === 'brief' && (
              <>
                <button type="button" className="ao-btn" disabled={busy !== ''} onClick={() => run('check', async () => {
                  const r = await checkReady(item.id);
                  setIssues(r.issues);
                  return r.ready ? 'Ready: it passes every check.' : 'Not ready yet. See the list below.';
                })}>{busy === 'check' ? 'Checking…' : 'Check it is ready'}</button>
                <button type="button" className="ao-btn ac-primary" disabled={busy !== ''} onClick={() => run('schedule', async () => {
                  const r = await publish(item.id, 'schedule');
                  return `Scheduled for ${when(r.scheduledFor)} Sydney time.`;
                })}>{busy === 'schedule' ? 'Scheduling…' : 'Schedule for the next slot'}</button>
                <button type="button" className="ao-btn" disabled={busy !== ''} onClick={() => {
                  if (window.confirm('Publish this post on the blog right now?')) void run('now', async () => { await publish(item.id, 'now'); return 'Published.'; });
                }}>{busy === 'now' ? 'Publishing…' : 'Publish now'}</button>
                <button type="button" className="ao-btn" disabled={busy !== ''} onClick={() => run('dismiss', async () => { await dismiss(item.id, 'Dropped after briefing'); })}>Drop</button>
              </>
            )}

            {item.status === 'published' && item.wpPostUrl && <a className="ao-btn ac-link" href={item.wpPostUrl} target="_blank" rel="noopener noreferrer">View post</a>}
            {item.needsRecheck && (
              <button type="button" className="ao-btn ac-primary" disabled={busy !== ''} onClick={() => run('recheck', async () => { await markRechecked(item.id); return 'Marked as rechecked.'; })}>
                I have re-read the official page and the post is still right
              </button>
            )}
            {item.status === 'dismissed' && (
              <button type="button" className="ao-btn" disabled={busy !== ''} onClick={() => run('restore', async () => { await restore(item.id); })}>Bring back</button>
            )}
            {!wordpress && item.status === 'new' && <span className="ao-dim">Connect WordPress to create drafts.</span>}
          </div>

          {note && <p className={`ac-note ${note.ok ? 'ac-ok' : 'ac-bad'}`} role="status">{note.text}</p>}
          {issues.length > 0 && <ul className="ac-issues">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
        </div>
      )}
    </li>
  );
}

export default function AdminContent() {
  const [overview, setOverview] = useState<ContentOverview | null>(null);
  const [tab, setTab] = useState<Tab>('new');
  const [items, setItems] = useState<ContentUpdate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    getOverview().then(setOverview).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load.'));
  }, [tick]);

  useEffect(() => {
    setLoading(true);
    listUpdates(tab, page)
      .then((r) => { setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items])); setTotal(r.total); setHasMore(r.hasMore); setError(''); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load.'))
      .finally(() => setLoading(false));
  }, [tab, page, tick]);

  useEffect(() => { setPage(1); }, [tab]);

  async function scan() {
    setScanning(true);
    setScanNote(null);
    try {
      const r = await scanNow();
      const base = `Checked the official sources: ${r.discovered} item(s) seen, ${r.added} new, ${r.changed} changed${r.enriched ? `, ${r.enriched} read in full` : ''}.`;
      const note = r.blocked
        ? `${base} The NDIS site is refusing automated requests right now, so the robot has stepped back and will try again later. Items were recorded from its news list; their full pages will be read on a later check.`
        : r.problems.length ? `${base} Problems: ${r.problems.join(' | ')}` : base;
      setScanNote({ ok: r.problems.length === 0 && !r.blocked, text: note });
      setPage(1);
      refresh();
    } catch (e) {
      setScanNote({ ok: false, text: e instanceof Error ? e.message : 'The check failed.' });
    } finally {
      setScanning(false);
    }
  }

  const count = (t: Tab) => (t === 'recheck' ? overview?.needsRecheck : overview?.counts[t]);

  return (
    <div className="ad-page">
      <div className="ad-header-row">
        <div>
          <h1 className="ad-heading">Content radar</h1>
          <p className="ad-subheading">Official NDIS news and policy changes, prepared as blog briefs. Nothing is published until a person has written it and it passes the checks.</p>
        </div>
        <button type="button" className="ao-btn ac-primary" disabled={scanning} onClick={scan}>{scanning ? 'Checking the sources…' : 'Check official sources now'}</button>
      </div>

      {scanNote && <p className={`ao-note ${scanNote.ok ? 'ao-note-ok' : 'ao-note-bad'}`} role="status">{scanNote.text}</p>}
      {error && <p className="ao-note ao-note-bad" role="alert">{error}</p>}

      {overview && (
        <div className="ac-status">
          <div className="ad-panel ac-stat">
            <span className={`ao-dot ${overview.wordpressConnected ? 'ao-dot-ok' : 'ao-dot-off'}`} />
            <div>
              <strong>{overview.wordpressConnected ? 'WordPress connected' : 'WordPress not connected'}</strong>
              <small>{overview.wordpressConnected ? 'Drafts and scheduling go to your blog.' : 'Set WORDPRESS_URL, WORDPRESS_APP_USER and WORDPRESS_APP_PASSWORD on the server.'}</small>
            </div>
          </div>
          <div className="ad-panel ac-stat">
            <div>
              <strong>{overview.lastRun ? `Last automatic check ${timeAgo(overview.lastRun.at)}` : 'No automatic check yet'}</strong>
              <small>{overview.lastRun ? overview.lastRun.summary || overview.lastRun.status : 'The cron job runs every 6 hours once it is added to the server.'}</small>
            </div>
          </div>
          <div className="ad-panel ac-stat">
            <div>
              <strong>Next publishing slot: {overview.nextSlot ? when(overview.nextSlot) : '—'}</strong>
              <small>{overview.settings.publishHour}:00 Sydney time, at most {overview.settings.maxPerDay} a day</small>
            </div>
          </div>
        </div>
      )}

      <div className="ac-tabs" role="group" aria-label="Filter by stage">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} className={`ae-chip${tab === t.id ? ' is-on' : ''}${t.id === 'recheck' && (overview?.needsRecheck ?? 0) > 0 ? ' ac-alert' : ''}`} title={t.hint} onClick={() => setTab(t.id)}>
            {t.label}{count(t.id) !== undefined ? ` (${count(t.id)})` : ''}
          </button>
        ))}
      </div>

      <ul className="ac-list-items">
        {items.map((it) => <Item key={it.id} item={it} wordpress={overview?.wordpressConnected ?? false} onChanged={refresh} />)}
      </ul>
      {!loading && items.length === 0 && !error && (
        <p className="ad-empty-note">{tab === 'new' ? 'Nothing waiting. New items from the official sources appear here.' : 'Nothing in this stage.'}</p>
      )}
      {loading && items.length === 0 && <p className="ad-empty-note">Loading…</p>}
      {hasMore && <div className="ae-more"><button type="button" className="ao-btn" disabled={loading} onClick={() => setPage((p) => p + 1)}>{loading ? 'Loading…' : `Show more (${total - items.length} left)`}</button></div>}

      <div className="ad-panel ac-howto">
        <h3 className="ad-panel-title">How this stays safe</h3>
        <ul>
          <li><strong>It reads facts, not articles.</strong> Only titles, dates, section headings and a change fingerprint are kept. The NDIA licenses its website CC BY-NC and asks that it is not used for commercial traffic, so posts must be written in your own words and cite the official page.</li>
          <li><strong>Drafts are private.</strong> Each brief is a WordPress draft with an outline and suggested internal links. It cannot be published while the brief box or any [[EDITOR…]] marker is in it, if it is thin, uncited, or has no excerpt.</li>
          <li><strong>Changes are caught.</strong> If an official page changes after you briefed or published on it, it moves to “Source changed” until you re-read it.</li>
          <li><strong>The robot is polite.</strong> It follows robots.txt, identifies itself, waits between requests and opens only a handful of pages per run.</li>
        </ul>
      </div>
    </div>
  );
}
