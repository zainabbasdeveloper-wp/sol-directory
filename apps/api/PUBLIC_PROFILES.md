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
