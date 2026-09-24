# Public provider and independent-worker profiles

## Providers — `/directory/:slug`
Public page for each active, un-paused provider (same rule as the directory
list). Shows what the provider entered: name, logo (or initials), supports,
service areas, funding accepted, experience, languages, age groups, intake
status, and suburb + state of the business. Never ABN, email, phone, street
address or coordinates. API: `GET /api/providers/public/:slug`.

## Independent workers — `/independent-workers/find`, `/independent-workers/:slug`
Opt-in only. A worker appears publicly when BOTH are true:
1. they switched on **Show my profile publicly** on `/worker/profile`
   (`Worker.publicProfile`), and
2. an admin approved them (`Worker.published`, set by the existing
   verification flow).

Public data: first name + last initial, job title, suburb + state, supports,
languages, experience, days available, indicative rate, bio, photo. Never a
surname, email, phone, address or coordinates. Contact stays behind the
existing organisation-only contact-request flow (`/workers`). A suspended
account, an opt-out or an un-approval removes the profile straight away.

Photos are cropped to a 480px square JPEG in the browser and stored in the
`workerphotos` collection (max 300 KB, JPEG only). No photo → initials.
There are no stock or generated images anywhere.

API: `GET /api/workers/public`, `/public/:slug`, `/public/:slug/photo`;
worker-only `GET/PUT /api/workers/me`, `GET/PUT/DELETE /api/workers/me/photo`.

## Crawlers
`/directory/:slug`, `/independent-workers/find` and `/independent-workers/:slug`
are served through the same SEO shell as the register pages (see
`REGISTER_IMPORT.md` and `deploy/nginx-soldirectory.conf`), and all public
profiles are in `sitemap-pages.xml`. The old sitemap listed the login-gated
`/providers/:slug`; that is gone.

## Provider logos and "My listing" (`/provider/listing`)
A provider uploads their own logo (browser scales it to <=512px JPEG, white
background; stored in `providerlogos`). The logo shown publicly is the
WordPress media-library one if there is one (that webhook owns
`Provider.logoUrl` and overwrites it), otherwise the upload, otherwise
initials. The page also tells a provider in plain words why their page
isn't visible (paused for an unconfirmed capacity check, no business name,
no supports listed, suspended).

## Location and experience pages
- `/directory/in/:suburb` - providers who list that suburb as an area they support.
- `/directory/for/:condition` and hub `/directory/for` - providers who list
  experience supporting a condition. Only conditions in the admin catalogue
  get a page, so free-text entries never become public URLs.
- Counts come from real, visible providers (`GET /api/providers/public/areas`
  and `/conditions`, cached 30 min). A page with fewer than 3 providers
  (`MIN_INDEXABLE_PROVIDERS`, mirrored in `ProviderListingPage.tsx`) is
  reachable but `noindex` and left out of the sitemap.
- Wording is deliberately factual ("providers list X") - providers write
  their own profiles and these pages make no clinical claims.
- Provider slugs `in`, `for`, `conditions`, `areas`, `find`, `new` are
  reserved so they can't collide with these paths.

## Worker reviews
- **Who can review:** a logged-in, active provider organisation that has sent
  the worker a contact request through SolDirectory. That proves they used the
  platform to reach the worker, not that they later worked together - so the
  form makes them confirm they have, and the public label says "provider
  organisation", never "verified engagement".
- **What's shown:** only reviews an admin has approved (Admin > Worker reviews,
  `/admin/worker-reviews`), with the reviewer's business name. One review per
  organisation per worker; editing an approved review sends it back to
  moderation and it stops counting until re-approved.
- **Ratings** are always computed from approved reviews. The public API never
  reads `Worker.rating` / `reviewCount`; those stored fields (used by the gated
  worker directory) are rewritten on every moderation decision.
- **One-off after deploy:** `npm run recompute:worker-ratings`. The demo seeds
  (`src/seed`) write random ratings into those stored fields; this resets every
  worker to what their approved reviews say (zero when none).
- **Not built:** worker replies to reviews, reporting a review, and review
  structured data (Google restricts self-hosted review markup).
- API: `GET /api/workers/public/:slug/reviews`; organisations
  `GET/POST /api/workers/:id/reviews`; workers `GET /api/workers/me/reviews`;
  admin `GET/PATCH /api/admin/worker-reviews`. New reviews email
  `ADMIN_NOTIFY_EMAIL` (or `ADMIN_NOTIFICATION_EMAIL`) if set.
- The old "Feedback" list on the gated worker page (seed-only testimonials) is
  replaced by real reviews.
