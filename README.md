# Lokal Platform

A community-scale platform for prepaid wallet, WiFi vouchers, prepaid electricity,
and **postpaid metered electricity billing** (agent captures household reading
→ generates invoice → collects cash → settles at the community office).

Includes RBAC, support tickets, web push notifications, and a PWA-capable frontend.

## Architecture

- **`backend-cloudflare/`** — Cloudflare Worker (D1-backed). Single source of truth.
  See [backend-cloudflare/README.md](backend-cloudflare/README.md) for deploy + secrets.
- **`frontend/`** — Vite + React + Tailwind + shadcn/ui PWA. Talks to the Cloudflare worker.

## Quick start (local dev)

Two terminals:

```bash
# 1. Backend (Cloudflare Worker, D1 simulated locally via Miniflare)
cd backend-cloudflare
npm install
npm run db:apply:local
echo "dev-secret-change-me" | npx wrangler secret put JWT_SECRET --local
npm run dev                  # → http://localhost:8787

# 2. Frontend
cd frontend
npm install
npm run dev                  # → http://localhost:5173
```

The frontend's `.env.development` already points at `http://localhost:8787`.

## Production deploy

See [backend-cloudflare/README.md](backend-cloudflare/README.md) for the full sequence.
TL;DR:

```bash
cd backend-cloudflare
npm run db:apply:remote
npx wrangler secret put JWT_SECRET            # 32+ char random
npx wrangler secret put VAPID_PUBLIC_KEY      # generate with `npx web-push generate-vapid-keys`
npx wrangler secret put VAPID_PRIVATE_KEY
npm run deploy
# Then: VITE_API_URL=https://<your-worker>.workers.dev npm run build (in frontend/)
```

## Features

### Postpaid electricity billing
- Tariff types: **FLAT**, **UNITS_BLOCK** (stepped), **TIME_OF_USE** (peak/standard/off-peak)
- Billing periods: weekly or monthly
- Household masterdata with auto-generated account number
- Agent captures meter reading → invoice generated with line-item breakdown
- Printable HTML receipt (`/billing/invoices/:id/receipt`)
- Two-party cash collection (agent submits with code, household confirms)
- Settlement workflow at community office (agent declares, office confirms)
- No partial payments — full settlement only

### Prepaid (legacy)
- Wallet with topup, transfer, transaction history
- WiFi voucher packs + activation
- Prepaid electricity unit packs (kWh)
- Agent sells WiFi/electricity to customers, earns tiered commission

### RBAC
Roles: `USER` (every authenticated user), `AGENT`, `OFFICE_MANAGER`, `SUPPORT`, `ADMIN`.
Multi-role assignments via `user_roles` table; `requireRole()` middleware on every endpoint.

### Support tools
- Ticket creation by users with category, priority, related entity
- Threaded messages (with internal-note flag for staff)
- Status transitions: OPEN → IN_PROGRESS → WAITING → RESOLVED → CLOSED
- Assignment to support staff
- Push notification on every state change

### Notifications
- PWA service worker with Web Push handler
- VAPID-signed push from the worker (RFC 8291 / aes128gcm via WebCrypto)
- In-app inbox for all events
- Push triggers: invoice issued, payment confirm request, payment received,
  settlement submitted/confirmed, ticket replies/status changes

### Admin
- Dashboard stats (users, agents, invoices, unsettled cash, open tickets)
- User actions: KYC, status, wallet adjust
- Agent actions: tier, status, float adjust
- Tariff CRUD
- Community office CRUD
- Product CRUD (WiFi + electricity packages)
- Revenue + agent reports
- Audit logs
- Role grants/revokes
- Settings: payment gateways, bank accounts, IoT devices

## Security notes

- JWT signed with HS256 via WebCrypto using the `JWT_SECRET` Wrangler secret
- Push payloads encrypted with the subscriber's per-device keys (`p256dh` + `auth`)
- All endpoints scoped via `requireRole(...)` — no implicit access
- Use **scoped Cloudflare API Tokens** for deploy, never the Global API Key
