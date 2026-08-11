# Flexi Route — Railway Deployment Guide

## Live URLs

| Service  | URL |
|----------|-----|
| Frontend | https://flexirouteglobal.com (also www.) |
| API      | https://api.flexirouteglobal.com |
| Frontend (Railway) | https://frontend-production-2fa3.up.railway.app |
| API (Railway)      | https://api-server-production-2c9f.up.railway.app |

## Railway Project

- **Project ID**: `3d50eed0-e0ed-4e8c-bc89-4b352bce0fcb`
- **Environment ID**: `5295ca21-8245-4517-add7-d5f48de8617c`
- **Project**: https://railway.app/project/3d50eed0-e0ed-4e8c-bc89-4b352bce0fcb

## Services

| Service   | Service ID |
|-----------|-----------|
| Postgres  | `5a149a94-c153-4f7c-aba0-100f719eccf1` |
| API Server | `f3aa4bc7-2ddc-488c-a1c2-0ff1ceefc153` |
| Frontend  | `c9b4c104-5ae9-4dae-b332-97e1c9615f86` |

## Admin Login

- **Email**: nkingsley130@gmail.com
- **Password**: admin134

## Environment Variables

### API Server
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres:FlexiRoute2024Secure!@postgres.railway.internal:5432/railway?sslmode=disable` |
| `SESSION_SECRET` | (set in Railway dashboard) |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://flexirouteglobal.com` |
| `EMAIL_FROM` | `Flexi Route <support@flexirouteglobal.com>` |
| `RESEND_API_KEY` | (set in Railway dashboard) |
| `PNPM_VERSION` | `10.26.1` |

### Frontend
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.flexirouteglobal.com` |
| `NODE_ENV` | `production` |
| `PNPM_VERSION` | `10.26.1` |

### Postgres
| Variable | Value |
|----------|-------|
| `POSTGRES_DB` | `railway` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `FlexiRoute2024Secure!` |
| `PGDATA` | `/var/lib/postgresql/data/pgdata` |

## Build Commands

### API Server
- **Build**: `pnpm install --no-frozen-lockfile && pnpm --filter @workspace/api-server run build`
- **Start**: `cd /app/lib/db && (npx drizzle-kit push --config ./drizzle.config.ts || true) && node --enable-source-maps /app/artifacts/api-server/dist/index.mjs`
- **Healthcheck**: `/api/healthz`

### Frontend
- **Build**: `pnpm install --no-frozen-lockfile && pnpm --filter @workspace/flexi-route run build && npm install -g serve`
- **Start**: `serve -s /app/artifacts/flexi-route/dist/public -l $PORT`

## DNS (Cloudflare — Zone: flexirouteglobal.com)

| Type  | Name                        | Target |
|-------|-----------------------------|--------|
| CNAME | flexirouteglobal.com        | frontend-production-2fa3.up.railway.app |
| CNAME | www.flexirouteglobal.com    | frontend-production-2fa3.up.railway.app |
| CNAME | api.flexirouteglobal.com    | api-server-production-2c9f.up.railway.app |

All records are **proxied through Cloudflare** (orange cloud). SSL mode: **Full**.

## Redeploying

To redeploy after a code push to GitHub:

```bash
# Push code
git push github main

# Trigger redeployments via Railway API (use RAILWAY secret)
# The Railway dashboard auto-deploys on git push if connected via GitHub trigger
```

## Notes

- The `railpack.json` at repo root overrides the default install command to use `--no-frozen-lockfile` (needed because pnpm overrides in pnpm-workspace.yaml are pnpm v10-only)
- Schema migrations run automatically at API startup via `drizzle-kit push`
- Admin user and default wallet addresses are seeded on first startup
- Postgres data is persisted via Railway volume at `/var/lib/postgresql/data` (PGDATA subdirectory)
