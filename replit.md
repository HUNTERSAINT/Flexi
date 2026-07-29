# Flexi Route — Logistics Platform

Full-stack US logistics website with customer, driver, and admin portals plus a crypto-only payment system.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 + shadcn/ui |
| Routing | wouter (SPA) |
| State | TanStack Query v5 |
| Backend | Express + Node.js (TypeScript) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (7-day expiry, role-embedded) |
| File Uploads | multer → local disk `/uploads/` |
| Payments | Manual crypto TXID submission — no blockchain APIs |

## Monorepo Structure

```
artifacts/
  flexi-route/       # React + Vite frontend (preview path /)
  api-server/        # Express REST API (port 8080)
lib/
  db/                # Drizzle schema + migrations
  api-spec/          # OpenAPI spec + orval codegen config
  api-client-react/  # Generated React Query hooks + custom-fetch
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@flexiroute.com | Admin@123 |
| Driver | driver@flexiroute.com | Driver@123 |
| Customer | customer@flexiroute.com | Customer@123 |

Demo shipment tracking number: `FR-20260728-DEMO0001`

## Payment Currencies Supported

- BTC (Bitcoin)
- ETH (Ethereum)
- USDT TRC20 (Tron)
- USDT ERC20 (Ethereum)
- USDC (USD Coin)
- LTC (Litecoin)

Wallet addresses are configured via environment variables (`WALLET_BTC`, `WALLET_ETH`, `WALLET_USDT_TRC20`, `WALLET_USDT_ERC20`, `WALLET_USDC`, `WALLET_LTC`). Development defaults are hardcoded in `artifacts/api-server/src/lib/wallets.ts`.

## Environment Variables / Secrets

| Key | Purpose |
|---|---|
| `SESSION_SECRET` | JWT signing secret (already provisioned) |
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Replit DB) |
| `WALLET_*` | Crypto wallet addresses for the 6 supported currencies |

## Key Routes

### Public
- `/` — Landing page with live tracking search
- `/pricing` — Dynamic pricing cards (fetched from DB)
- `/track` — Public shipment tracker by tracking number
- `/login`, `/register` — Auth pages

### Customer Dashboard (`/dashboard/*`)
- `/dashboard` — Overview + recent shipments
- `/dashboard/book` — 4-step shipment booking wizard
- `/dashboard/shipments` — Full shipments list with filter
- `/dashboard/payments` — Payment status + TXID/proof submission
- `/dashboard/notifications` — Notification centre
- `/dashboard/tracking/:trackingNumber` — Detailed tracking timeline

### Admin Dashboard (`/admin/*`)
- `/admin` — Analytics: revenue, counts, chart by status
- `/admin/shipments` — All shipments + status management + driver assignment
- `/admin/payments` — Payment ledger + approve / reject with notes
- `/admin/customers` — Customer list + suspend/activate
- `/admin/drivers` — Driver fleet + add/delete/toggle availability
- `/admin/pricing` — Edit base rates and per-kg modifiers

### Driver Dashboard (`/driver/*`)
- `/driver` — Active route overview
- `/driver/deliveries` — Filtered delivery list
- `/driver/delivery/:id` — Detail view with status update panel + proof of delivery upload

## API Endpoints (base `/api`)

```
POST /auth/register       POST /auth/login
GET  /auth/me             PATCH /auth/me/password

GET  /users               GET/PATCH/DELETE /users/:id

GET  /shipments           POST /shipments
GET  /shipments/:id       PATCH /shipments/:id
POST /shipments/:id/assign-driver
GET  /shipments/:id/events
POST /shipments/:id/events
POST /shipments/:id/delivery-proof

GET  /payments            POST /payments
PATCH /payments/:id
POST /payments/:id/proof
GET  /wallets

GET  /drivers             POST /drivers
PATCH/DELETE /drivers/:id
GET  /driver/deliveries

GET  /notifications       PATCH /notifications/:id/read
POST /notifications/read-all

GET  /admin/analytics
GET  /pricing             PATCH /pricing/:id

GET  /track/:trackingNumber   (public)
```

## Running Locally

All three workflows auto-start:
- **Frontend** — `pnpm --filter @workspace/flexi-route run dev`
- **API Server** — `pnpm --filter @workspace/api-server run dev`
- **Component Preview** — managed by Replit

After schema changes: `pnpm --filter @workspace/db run push`

After OpenAPI spec changes: `pnpm --filter @workspace/api-spec run generate`

## User Preferences

- Company name: **Flexi Route** (two words, capital R)
- US-based logistics company
- Crypto-only payments (no card/bank integration)
- No blockchain APIs — manual TXID + proof-of-payment review flow
