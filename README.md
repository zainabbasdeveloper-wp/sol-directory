# SolDirectory — MERN + TypeScript

A subscription NDIS worker directory, rebuilt in TypeScript across a
proper monorepo, addressing the correctness requirements a plain-JS
first pass didn't meet: server-side geospatial + paginated search,
metadata-only document storage, webhook-owned subscription state, and
a structurally (not just conventionally) append-only audit trail.

## What changed from the JS version, and why

This is a second implementation, not a refactor of the first. The
JS build worked but cut real corners against the actual product
requirements:

| Requirement | JS build | This build |
|---|---|---|
| Directory search | Fetched all workers, filtered in the browser | Server-side, paginated, hits a compound index + `2dsphere` geo index |
| Documents | Stored as plain fields on the Worker document | Metadata only (`DocumentAsset`); files go to object storage via signed URLs |
| Subscription plan | Client could call a `switchPlan` endpoint directly | Only a Stripe webhook writes `Provider.plan` — no client-facing route sets it |
| Pricing/quota | Hardcoded JS constants | `PlanConfig` — a Mongoose collection, admin-editable |
| Privacy masking | A `.toPublicJSON(unlocked)` method called after fetching the full document | `.select()` projections that never fetch `lastName`/`email`/`phone` from Mongo in the first place for a masked response |
| Audit trail | Append-only by convention (a code comment) | Append-only structurally — `insertOnlyPlugin` throws at the Mongoose middleware level on any update/delete attempt |
| Types | None (plain JS) | Shared `@soldirectory/shared-types` package; `WorkerMasked`/`WorkerUnlocked` are distinct types, so a route that leaks a contact field on the masked path fails to *compile* |

## Monorepo layout

```
soldirectory-ts/
├── apps/
│   ├── web/                 React + Vite + TypeScript
│   │   └── src/
│   │       ├── api/              Typed fetch client + one function per resource
│   │       ├── components/ui/    Button, Field (Input/Select/Textarea), Chip/Pill/Checkbox, Toast
│   │       ├── components/layout/ App shell (header, tabs, routing wrapper)
│   │       ├── pages/
│   │       │   ├── public/       Home, ServicePage — public marketing pages
│   │       │   ├── auth/         Login, Signup
│   │       │   ├── workers/      WorkerDirectory, WorkerProfile
│   │       │   └── Dashboard.tsx, Leads.tsx, Plans.tsx, Onboarding.tsx, Verification.tsx
│   │       ├── context/          AuthContext (real API calls, not in-memory-only)
│   │       └── routes/           AppRoutes.tsx
│   │
│   └── api/                  Express + TypeScript + MongoDB/Mongoose
│       └── src/
│           ├── models/            User, Worker, Provider, Lead, UnlockLedger, AuditEntry,
│           │                      DocumentAsset, PlanConfig, WebhookEvent
│           ├── controllers/       Business logic
│           ├── routes/            One file per resource
│           ├── middleware/        JWT auth, role guard
│           ├── services/          s3.service.ts, stripe.service.ts
│           ├── plugins/           insertOnly.plugin.ts
│           ├── config/            DB connection
│           └── seed/              Loads real fixture data (with real Sydney suburb coordinates)
│
├── packages/
│   ├── shared-types/          The actual privacy contract — both apps compile against this
│   └── design-tokens/         tokens.json (source of truth) + typed export + tokens.css
│
└── design-reference/           (add your own copy of the original design handoff here — not included)
```

## Getting started

**Prerequisites:** Node 20+, a MongoDB instance (local or Atlas).

```bash
npm install                       # installs all workspaces from the root

cd apps/api
cp .env.example .env              # fill in MONGODB_URI at minimum
npm run seed                      # loads real fixture data, once
npm run dev                       # http://localhost:4000

# separate terminal
cd apps/web
cp .env.example .env
npm run dev                       # http://localhost:5173
```

Seeded accounts (password `password123`): `provider@example.com.au`,
`admin@example.com.au`, plus one worker account per seeded worker.

## The correctness requirements, and where to find them

- **Server-side privacy masking, via query projection** —
  `apps/api/src/models/Worker.ts`'s `MASKED_PROJECTION` /
  `UNLOCKED_PROJECTION` constants, used in `.select()` calls in
  `workers.controller.ts`. Same pattern in `Lead.ts` /
  `leads.controller.ts`.
- **Server-side subscription gating** — `leads.controller.ts`'s
  `unlockLead` checks `PlanConfig` and `provider.leadUnlocksUsedThisPeriod`
  before ever calling `toUnlockedShape`.
- **Geospatial + compound indexes** — `Worker.ts`: `2dsphere` on
  `location`, compound on `{services, suburb, published}`. The radius
  filter in `workers.controller.ts` uses `$geoWithin`/`$centerSphere`
  against real coordinates (see the seed script's `SUBURB_COORDS`).
- **Pagination** — `listWorkers` caps at `MAX_LIMIT = 50` and returns
  a `PaginatedResult<WorkerMasked>`; never an unbounded array.
- **Documents in object storage, metadata only in Mongo** —
  `DocumentAsset.ts` + `services/s3.service.ts`. Signed URLs keep file
  bytes out of the API process, while server-side object verification
  prevents incomplete uploads from satisfying compliance checks.
- **Webhook-owned subscription state** — `services/stripe.service.ts`
  is the only code path that writes `Provider.plan`. `WebhookEvent`
  gives it idempotency against Stripe's at-least-once delivery.
  `routes/webhooks.routes.ts` has no `requireAuth` — Stripe's
  signature is the auth (verification is still a TODO, see below).
- **Append-only audit trail, structurally enforced** —
  `plugins/insertOnly.plugin.ts` attached to `AuditEntry`'s schema;
  `appendAuditEntry()` in the same file is the only sanctioned way to
  add an entry, and derives each timestamp from the previous one so
  the trail can't go chronologically backwards.
- **Idempotent unlocks** — `leads.controller.ts` requires an
  `Idempotency-Key` header; `UnlockLedger` has a unique
  `(providerId, leadId)` index so even two different keys can't
  double-unlock the same lead.

## Production document storage

Provider compliance uploads use short-lived signed S3 PUT URLs. The
browser uploads directly to object storage, then the API verifies the
object with `HeadObject` before creating a completed `DocumentAsset`.
Without storage configuration, upload requests fail with HTTP 503 and
cannot mark onboarding complete.

Set these variables in the API process environment:

```text
S3_BUCKET=private-document-bucket
S3_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

For an S3-compatible service, also set `S3_ENDPOINT` and, when
required, `S3_FORCE_PATH_STYLE=true`. Keep the bucket private and
configure CORS to allow `PUT` from `CLIENT_ORIGIN` with the
`Content-Type` header. Do not place credentials in tracked files.

## Scheduled jobs

The API jobs are one-shot, cron-friendly commands. A typical production
schedule from the repository root is:

```cron
*/15 * * * * cd /path/to/soldirectory-ts && npm run job:lead-escalation --workspace=apps/api
0 * * * * cd /path/to/soldirectory-ts && npm run job:search-alerts --workspace=apps/api
0 8 * * 1 cd /path/to/soldirectory-ts && npm run job:capacity-check --workspace=apps/api
```

Lead escalation defaults to a 120-minute delay, five additional
providers per run and ten total notified providers per lead. Configure
these with `LEAD_ESCALATION_DELAY_MINUTES`,
`LEAD_ESCALATION_BATCH_SIZE`, `MAX_TOTAL_PROVIDERS_PER_LEAD`, and
`LEAD_ESCALATION_LEADS_PER_RUN`. It stops escalating as soon as an
existing match has viewed or responded to the lead.

## What's still a TODO, explicitly

- **Stripe webhook signature verification** —
  `webhooks.controller.ts` currently trusts the request body as-is.
  Before this touches real payments, verify against the
  `Stripe-Signature` header using
  `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
- **Contact-request acceptance flow** — there's no `ContactRequest`
  model yet; `WorkerProfile.tsx`'s "Request contact" button calls a
  real endpoint, but that endpoint doesn't yet track acceptance state
  or notify the worker.
- **Ten-filter parity** — the client currently exposes 6 of the
  design's 10 directory filters (service, suburb, language, gender,
  condition, rate, rating). Radius search is implemented server-side
  but not yet wired to a UI control (needs a geolocation prompt or a
  suburb-to-coordinates lookup on the client).
- **Headless WordPress** — `wp.routes.ts` proxies to
  `WORDPRESS_GRAPHQL_URL`, but nothing on the client calls it yet;
  `pages/public/Home.tsx` still uses static copy extracted from the
  original design file.

## Design tokens

`packages/design-tokens/src/tokens.json` is the single source of
truth. `tokens.css` (imported by `apps/web/src/styles/global.css`)
and `index.ts` (a typed export for anywhere the client needs a token
value in JS/TS rather than CSS) are both derived from it — edit the
JSON, not the generated files, if a design value needs to change.
