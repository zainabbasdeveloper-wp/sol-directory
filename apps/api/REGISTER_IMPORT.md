# Public-register listings: import and go-live runbook

The `/ndis-providers` and `/aged-care-providers` pages come from the
`registerlistings` collection. They are **not** Providers: no account, no
contact details, never counted as "accepting enquiries", never used for
matching. See `src/models/RegisterListing.ts`.

## 1. Import

```bash
cd apps/api
npm run import:register -- "<path>/providers.jsonl" --dry-run   # report only, writes nothing
npm run import:register -- "<path>/providers.jsonl"             # writes to MONGODB_URI
```

* Only register facts are read: name, register type, state, suburbs,
  recognised service names, the provider's own website. Any prose in the
  source file (descriptions, FAQs, titles, phone numbers) is ignored on
  purpose.
* Safe to re-run: it upserts on `(type, slug)` and never resets a claim
  (`claimStatus`) or the import date of an existing listing.
* About 26,500 listings take about a minute.

## 2. Production wiring (nginx + API env)

1. Use the updated `deploy/nginx-soldirectory.conf`. It proxies
   `/sitemap*.xml` (the sitemap index and its parts) and
   `/ndis-providers/*`, `/aged-care-providers/*` to the API, which returns
   the built `index.html` with real title, meta, canonical, JSON-LD and a
   plain-HTML copy of the page, so crawlers that don't run JavaScript still
   see the content. If the API is down nginx falls back to the plain SPA.
2. API env: `SITE_URL` (canonical/sitemap base, already in `.env.example`),
   and `WEB_DIST_DIR` if the API isn't started from `apps/api`.
3. Indexing stays off until you build the web app with
   `VITE_ALLOW_INDEXING=true` **and** remove `Disallow: /` from robots.txt.

## 3. Claim requests

Businesses use "Is this your business?" on a provider page. Requests are
saved in `claimrequests` and listed at **/admin/claims** (admin login).
Compare each with the business's own website, then Verify or Reject.
Verifying marks the listing "claimed"; the business still signs up as a
normal provider. An email goes to `ADMIN_NOTIFY_EMAIL` (or
`ADMIN_NOTIFICATION_EMAIL`) if set.
