# Flexi Route — Railway Deployment Guide

Flexi Route runs as **one Railway service** (`API Server`). The same Node process
serves the API under `/api` and the built React website for every other path, so
the site and the API share one origin and no cross-origin setup is needed.

## Live URLs

| What     | URL |
|----------|-----|
| Website  | https://flexirouteglobal.com (www redirects to the apex) |
| API      | https://flexirouteglobal.com/api (also https://api.flexirouteglobal.com) |
| Railway  | https://api-server-production-2c9f.up.railway.app |

## Railway Project

- **Project ID**: `3d50eed0-e0ed-4e8c-bc89-4b352bce0fcb`
- **Environment ID**: `5295ca21-8245-4517-add7-d5f48de8617c`

## Services

| Service    | Service ID |
|------------|-----------|
| API Server (website + API) | `f3aa4bc7-2ddc-488c-a1c2-0ff1ceefc153` |
| Postgres (legacy backup, no longer used by the app) | `5a149a94-c153-4f7c-aba0-100f719eccf1` |

The database is **Supabase**. Railway Postgres is kept only as a backup until it is deleted.

## Environment Variables (API Server service)

Never put real values in this file or anywhere in Git. Set them in the Railway
dashboard (Variables tab → Raw Editor).

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Supabase **Session pooler** connection string |
| `SESSION_SECRET` | Long random string. **Required in production** (the server refuses to start without it) |
| `FLEXI_ADMIN_EMAIL` | Email of the admin account |
| `FLEXI_ADMIN_PASSWORD` | Admin password, 10+ characters. It is the source of truth: on every start the admin account is created or synchronized to it. To change the admin password, change this variable and redeploy. If either admin variable is missing, admin seeding is skipped. |
| `NODE_ENV` | `production` |
| `APP_URL` / `PUBLIC_APP_URL` | `https://flexirouteglobal.com` |
| `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_NOTIFICATION_EMAIL` | Email addresses |
| `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `RESEND_WEBHOOK_SECRET` | Resend email |
| `CLOUDAPI_KEY` | As configured |
| `PNPM_VERSION` | `10.26.1` |
| `VITE_API_URL` | **Leave unset.** The website calls `/api` on its own origin. |
| `FRONTEND_DIST` | Optional. Overrides the folder of the built website. |

## Build / Start / Health

- **Build**: `pnpm install --no-frozen-lockfile && pnpm --filter @workspace/flexi-route run build && pnpm --filter @workspace/api-server run build`
- **Pre-deploy**: `pnpm --filter @workspace/db exec drizzle-kit push --config ./drizzle.config.ts`
- **Start**: `node --enable-source-maps /app/artifacts/api-server/dist/index.mjs`
- **Healthcheck**: `/api/healthz`

The API server serves `artifacts/flexi-route/dist/public` when it exists. If it
is missing (local API-only development), only the API is served.

## DNS (Cloudflare — zone: flexirouteglobal.com)

| Type  | Name                        | Target |
|-------|-----------------------------|--------|
| CNAME | flexirouteglobal.com        | api-server-production-2c9f.up.railway.app |
| CNAME | www.flexirouteglobal.com    | api-server-production-2c9f.up.railway.app |
| CNAME | api.flexirouteglobal.com    | api-server-production-2c9f.up.railway.app |

Proxied through Cloudflare (orange cloud), SSL mode **Full**. All three
hostnames must also be added as custom domains on the API Server service.

## Redeploying

Pushing to the connected GitHub branch deploys automatically.

## Notes

- `railpack.json` at the repo root keeps `pnpm install --no-frozen-lockfile` (needed because the pnpm overrides in `pnpm-workspace.yaml` are pnpm v10-only).
- The admin user, default wallets, pricing and shipment statuses are seeded on first startup.
