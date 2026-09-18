---
name: Flexi Route Setup
description: Bootstrap decisions, DB schema notes, and feature implementation details for the Flexi Route logistics app.
---

## Artifact layout
- Frontend: `artifacts/flexi-route/` — React + Vite + Wouter + TanStack Query + Shadcn + Framer Motion
- Backend: `artifacts/api-server/` — Express 5, pino logging, JWT auth
- DB schema: `lib/db/src/schema/` — Drizzle ORM + PostgreSQL
- API client: `lib/api-client-react/src/generated/api.ts` — OpenAPI codegen (run `pnpm --filter @workspace/api-spec run codegen` after spec changes)

## Railway startup
- Keep each workspace package manifest named for its actual `@workspace/*` filter. Railway's service build commands depend on those filters matching.
- Run Drizzle schema sync as a Railway pre-deploy command and keep the API start command limited to launching the built bundle. The API must begin listening before non-critical seed work.

**Why:** Railway previously reported missing `drizzle-kit`, no API bundle, and health-check timeouts because package manifests had been overwritten and migration/seeding ran before the listener existed.

**How to apply:** When changing Railway commands or workspace manifests, verify the filtered build locally, confirm `/api/healthz` returns 200, and query the Railway service instance before redeploying.

## GitHub and Railway operations
- For this repository, authenticate Git pushes with the GitHub token in an `x-access-token` HTTPS URL; the equivalent Git extra-header form was rejected even though the token worked with the GitHub API.
- Railway deployment status can be queried through its GraphQL API using the project and service IDs documented in `RAILWAY.md`.

**Why:** The imported repository can be ahead or behind the local project checkpoint, and Railway deploys both the API and frontend from the same Git push.

**How to apply:** Fetch the remote branch before pushing to avoid overwriting newer Flexi commits, then monitor the latest API Server and Frontend deployments until both reach a terminal status.

## CSS color theme
- Primary: orange `25 95% 53%`
- Secondary (sidebar/nav): dark navy `222 47% 11%`
- Background: white `0 0% 100%`
- Both `--primary` and `--secondary` are set in `artifacts/flexi-route/src/index.css`

**Why:** The original zip had `red` placeholder values for all HSL vars. The fix is permanently in index.css now.

## Key backend notes
- `signToken()` is exported from `artifacts/api-server/src/middlewares/auth.ts` — use it for guest booking token generation
- Guest booking endpoint: `POST /api/shipments/guest` — no auth required; auto-creates customer account from email, returns JWT token
- `requireRole(...)` / `requireAuth` are the standard middleware helpers

## DB schema additions (done)
- `shipmentsTable`: added `recipientEmail text` and `receiverPays boolean default false`
- Run `pnpm --filter @workspace/db run push` after any schema change; `psql $DATABASE_URL -c "..."` works for direct seeding

## Pricing seed
- Seeded 4 rows: standard/express/overnight/freight via `psql $DATABASE_URL`
- Has unique constraint on `service_type` — use `ON CONFLICT DO UPDATE` for re-seeding

## Guest booking flow
- `/book` route: if not authenticated → renders `pages/public/book-public.tsx`; if authenticated → redirects to `/dashboard/book`
- Guest booking auto-creates a customer account (random temp password) or reuses existing email
- Returns JWT token so the guest can access their shipment immediately after booking

## Receiver pays flow
- Booking form has "Who pays?" toggle (sender/receiver)
- If receiver pays: skip payment creation, store `recipientEmail` on shipment, show confirmation message
- Payment is collected when receiver visits tracking page (future: add payment button on public track page)

## Payment currency consistency
- Keep supported cryptocurrency values aligned across the database enum, API contract, wallet seed data, and payment UI.
- **Why:** A wallet can exist for a currency while payment-row creation still fails at runtime if the database enum or generated contract omits it.
- **How to apply:** When adding a currency, update all four surfaces, regenerate API types, and push the development schema before testing the receiver payment flow.

## Pages with real content + Unsplash images
- About, Services, Contact, FAQ — all fully implemented with images and real copy
- 404 (not-found.tsx) already existed in the codebase
