# Content radar: official-source monitor and blog automation

What it does, in one line: watches official NDIS pages, queues what is worth writing about, prepares private WordPress
briefs, and schedules posts once a person has written them and they pass the checks. It never publishes by itself.

## Parts

| Part | File |
| --- | --- |
| Crawler (robots.txt, polite fetch, back-off, topic scoring) | `src/services/officialSources.ts` |
| WordPress briefs, readiness checks, scheduling | `src/services/blogAutomation.ts` |
| Cron script (job name `ndis-news-monitor`) | `src/scripts/monitorNdisNews.ts` |
| Admin API | `src/routes/admin.content.routes.ts` -> `/api/admin/content/*` |
| Admin page | `/admin/content` (header tab "Content") |
| Records | `SourceUpdate`, `CrawlState` (Mongo) |

## Workflow

1. **Found.** The monitor reads the NDIS latest-news list and the recently-updated list. Each item is stored with
   title, date, category, section headings, topics and a 0-100 priority. Only facts are kept, not article text.
2. **Brief.** The top new items (priority >= `NDIS_NEWS_MIN_PRIORITY`, newer than 60 days, at most
   `NDIS_NEWS_MONITOR_MAX_DRAFTS` per run) become private WordPress drafts titled `[Brief] ...` in the
   "NDIS updates" category, with an outline, the official link and suggested internal links. A brief an older version
   of the monitor already made is adopted rather than duplicated.
3. **Write.** A person writes the post in WordPress in their own words.
4. **Check and schedule.** In `/admin/content`, "Schedule for the next slot" runs the readiness check and, only if it
   passes, sets the post to `future` at the next free slot (default 9:00 Sydney time, one per day).
5. **Follow-up.** If an official page changes after a post was briefed or published, the item moves to
   "Source changed" until someone re-reads it.

### The readiness check refuses a post that
- still has the editor brief box or any `[[EDITOR ...]]` marker;
- still has a title starting `[Brief]`;
- is shorter than `BLOG_MIN_WORDS` (default 300);
- does not link to the official NDIS page;
- has no excerpt of 50-300 characters;
- contains the official summary sentence word for word;
- sits on an official page that has changed since it was briefed.

## Why it is built this way

The NDIA's copyright page licenses its website content CC BY-NC 3.0, asks that it is not used for commercial
purposes, and says its site should not be used to drive commercial traffic. SolDirectory is a commercial directory, so
copying or paraphrasing NDIA text is not safe. The system therefore keeps facts, links and citations, and the writing is
original. Ask counsel before changing that, and about linking to ndis.gov.au (their page says linking may need
permission).

ndis.gov.au sits behind bot protection. The crawler obeys robots.txt, identifies itself
(`SolDirectoryBot/1.0 (+site)`), waits `OFFICIAL_SOURCES_GAP_MS` between requests and opens at most
`OFFICIAL_SOURCES_MAX_DETAILS` article pages per run. It does not rotate user agents or otherwise work round a refusal.

- If the **news lists** are refused (HTTP 403/429/503) it pauses everything for `OFFICIAL_SOURCES_BACKOFF_MINUTES` (60).
- If only the **article pages** are refused, which is common from a data-centre address, it stops after the first
  refusal and pauses article reading for `OFFICIAL_SOURCES_DETAIL_BACKOFF_MINUTES` (360). The lists keep being read, so
  the queue still fills with title, date, category and summary, and briefs can still be created. Section outlines stay
  blank until articles can be read again, when they are filled in automatically.

If article pages stay refused, ask the NDIA web team (https://www.ndis.gov.au/contact/feedback-and-enquiries) to allow
the user agent `SolDirectoryBot` from the server's IP, or to provide a feed. Do not work round the block.

## Settings (apps/api/.env)

```
WORDPRESS_URL=...                 # REST base
WORDPRESS_APP_USER=...            # application password user
WORDPRESS_APP_PASSWORD=...
WORDPRESS_ADMIN_URL=              # optional: public wp-admin base for the "Open in WordPress" link
NDIS_NEWS_MONITOR_MAX_DRAFTS=6
NDIS_NEWS_MIN_PRIORITY=45
NDIS_NEWS_AUTO_BRIEF=true         # false = only record items, create briefs from the admin page
BLOG_PUBLISH_HOUR=9               # Sydney time
BLOG_MAX_PER_DAY=1
BLOG_MIN_WORDS=300
OFFICIAL_SOURCES_GAP_MS=1500
OFFICIAL_SOURCES_MAX_DETAILS=15
OFFICIAL_SOURCES_BACKOFF_MINUTES=60
OFFICIAL_SOURCES_DETAIL_BACKOFF_MINUTES=360
```

## Cron

```
0 */6 * * * cd /var/www/soldirectory && npm run job:ndis-news-monitor -w apps/api >> /var/log/soldirectory-ndis-news.log 2>&1
```

`npm run job:ndis-news-monitor -w apps/api -- --dry-run` reads the sources and changes nothing.

## Adding another official source

Add an entry to `SOURCES` in `officialSources.ts` with its list URL and a `parse` function returning
`{ url, title, categories, publishedAt }`. Check its robots.txt and licence first. The NDIS Commission and aged care
sites were not reachable from the development machine when this was built, so they are not included yet.
