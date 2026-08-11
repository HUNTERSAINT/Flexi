# Deploying Flexi Route to Railway

## Overview

You need **three Railway services**:
1. **PostgreSQL** — managed database (Railway add-on)
2. **API Server** — the Express backend
3. **Frontend** — the React/Vite app (static site)

---

## Step 1: Push to GitHub

Railway deploys from GitHub. Push this repo to a GitHub repository first.

```bash
git remote add origin https://github.com/YOUR_USERNAME/flexi-route.git
git push -u origin main
```

---

## Step 2: Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project → Deploy from GitHub repo**.
3. Select your repository.

---

## Step 3: Add PostgreSQL

Inside your Railway project:
1. Click **+ New Service → Database → PostgreSQL**.
2. Railway creates the database and automatically provides `DATABASE_URL`.

---

## Step 4: Deploy the API Server

1. Click **+ New Service → GitHub Repo** (same repo).
2. In the service settings:

| Setting | Value |
|---|---|
| **Root Directory** | `/` |
| **Build Command** | `pnpm install && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |

3. Add these **environment variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Click "Add Reference" → select your PostgreSQL service |
| `SESSION_SECRET` | A long random string (e.g. `openssl rand -hex 32`) |
| `RESEND_API_KEY` | Your Resend API key from [resend.com](https://resend.com) |
| `EMAIL_FROM` | `Flexi Route <support@flexirouteglobal.com>` |
| `APP_URL` | Your frontend Railway URL (set this after Step 5) |

4. Deploy. Wait for the build to finish and note the generated domain (e.g. `https://flexi-route-api.up.railway.app`).

5. After the first deploy, run the DB schema push **once** from Railway's terminal:
   ```bash
   cd lib/db && pnpm run push
   ```
   Or add it as a one-time deploy command:
   ```
   pnpm install && cd lib/db && DATABASE_URL=$DATABASE_URL pnpm run push && cd ../.. && pnpm --filter @workspace/api-server run build
   ```

---

## Step 5: Deploy the Frontend

1. Click **+ New Service → GitHub Repo** (same repo again).
2. In the service settings:

| Setting | Value |
|---|---|
| **Root Directory** | `/` |
| **Build Command** | `pnpm install && pnpm --filter @workspace/flexi-route run build` |
| **Start Command** | `npx serve -s artifacts/flexi-route/dist/public -l $PORT` |

3. Add these **environment variables** (set before the build runs):

| Variable | Value |
|---|---|
| `VITE_API_URL` | The API service URL from Step 4 (e.g. `https://flexi-route-api.up.railway.app`) |
| `BASE_PATH` | `/` |

> ⚠️ `VITE_API_URL` is baked into the JS bundle at build time — set it before deploying.

4. Deploy. Note the generated domain (e.g. `https://flexi-route.up.railway.app`).

5. Go back to the **API Server** service and set:
   ```
   APP_URL = https://flexi-route.up.railway.app
   ```
   Then redeploy the API so email links point to the right URL.

---

## Step 6: Custom Domain (optional)

In Railway, go to each service → **Settings → Domains** → **Add Custom Domain**.

- Frontend: `flexirouteglobal.com`
- API: `api.flexirouteglobal.com`

Point your DNS to Railway's provided CNAME values.

---

## Environment Variable Summary

### API Server
| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Auto-provided by Railway PostgreSQL |
| `SESSION_SECRET` | ✅ | Random string, keep secret |
| `RESEND_API_KEY` | ✅ | From resend.com dashboard |
| `EMAIL_FROM` | ✅ | Must be a verified Resend sender domain |
| `APP_URL` | ✅ | Frontend URL (for email links) |
| `EMAIL_REPLY_TO` | Optional | Defaults to `EMAIL_FROM` |
| `PORT` | Auto | Railway sets this automatically |

### Frontend
| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | ✅ | Full URL of the API service |
| `BASE_PATH` | ✅ | Set to `/` |
| `PORT` | Auto | Railway sets this automatically |

---

## File Upload Persistence

The API server saves uploaded payment proof files to a local `uploads/` folder. This folder is **ephemeral on Railway** — files are lost on each deploy.

To fix this before going to production, use an S3-compatible object store (e.g. Cloudflare R2, AWS S3) and upload files there instead of disk. This is a future improvement.

---

## Troubleshooting

**Build fails with "workspace:* not found"**
Make sure the build command runs `pnpm install` from the repo root (`/`), not from the service subdirectory.

**API returns 500 on first boot**
The database tables don't exist yet. Run `lib/db pnpm run push` once to create them (see Step 4.5).

**Emails not sending**
Check that `RESEND_API_KEY` is set on the API service and that your `EMAIL_FROM` domain is verified in Resend.

**Frontend shows blank page or API errors**
Verify `VITE_API_URL` was set **before** the frontend build ran. If it wasn't, redeploy the frontend service with the variable set.
