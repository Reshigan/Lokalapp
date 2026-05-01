# Lokal Platform — Cloudflare Worker backend

D1-backed Cloudflare Worker. Source of truth for the Lokal platform.

## Quick start (local dev)

```bash
cd backend-cloudflare
npm install
# 1. Apply schema + seed to local D1
npm run db:apply:local
# 2. Set the JWT secret for local dev (any random string is fine)
echo "dev-secret-change-me" | npx wrangler secret put JWT_SECRET --local
# 3. Start the worker
npm run dev          # → http://localhost:8787
```

The frontend's `.env.development` already points at `http://localhost:8787`.

## Deploying to production

You will need:
- A Cloudflare API Token with **Workers Scripts: Edit** + **D1: Edit** scoped to this worker / database. Do **NOT** use a Global API Key.
- A D1 database called `lokal-db` (already configured in `wrangler.toml`).

```bash
cd backend-cloudflare
# 1. Apply schema + seed to remote D1
npm run db:apply:remote

# 2. Set required secrets (each command prompts for the value):
npx wrangler secret put JWT_SECRET            # any 32+ char random string
npx wrangler secret put VAPID_PUBLIC_KEY      # see ../scripts/generate-vapid.sh
npx wrangler secret put VAPID_PRIVATE_KEY
# Optional:
npx wrangler secret put SMS_PROVIDER          # any value disables debug_otp in /auth/otp/request
npx wrangler secret put PAYFAST_MERCHANT_ID
npx wrangler secret put PAYFAST_MERCHANT_KEY

# 3. Deploy
npm run deploy
```

Once deployed, the frontend's `VITE_API_URL` should point at your worker URL
(e.g. `https://lokal-api.<account>.workers.dev`).

## Generating VAPID keys for Web Push

VAPID is required to send Web Push to subscribed browsers.

```bash
# In any environment with web-push installed:
npx web-push generate-vapid-keys
```

Set both keys via `wrangler secret put`. The public key is also returned by
`GET /notifications/vapid-public-key` so the frontend can subscribe.

## RBAC roles

Roles are stored in `user_roles` and resolved on every request:

| role            | granted to                                  | grants access to                          |
|-----------------|---------------------------------------------|-------------------------------------------|
| `USER`          | every authenticated user                    | wallet, history, support tickets          |
| `AGENT`         | users registered via `/agent/register`      | households, readings, collections, settle |
| `OFFICE_MANAGER`| office's manager_user_id, or via grant      | confirm settlements                       |
| `SUPPORT`       | granted by admin                            | support inbox, reply, change ticket state |
| `ADMIN`         | granted by admin (also sets `users.is_admin`)| tariffs, offices, role grants, audit log |

Manage roles via `/support/roles/grant` and `/support/roles/revoke`
(admin-only) or the Admin → Roles UI.

## Schema migrations

Migrations live in `migrations/`. Schema is in `0001_initial.sql`, seed data
in `0002_seed.sql`. To add a migration:

```bash
# create migrations/0003_*.sql
npx wrangler d1 execute lokal-db --local --file=./migrations/0003_*.sql
npx wrangler d1 execute lokal-db --remote --file=./migrations/0003_*.sql
```

## Architecture

```
src/
  worker.js              # router + scope-based authorization
  lib/
    http.js              # JSON / HTML helpers + CORS
    db.js                # D1 query helpers
    ids.js               # UUID + reference number generators
    auth.js              # JWT (HS256) + RBAC + PIN hashing
    billing.js           # tariff calculation (FLAT, BLOCK, TOU)
    push.js              # Web Push (VAPID + aes128gcm) via WebCrypto
    notify.js            # in-app log + best-effort push dispatch
  handlers/
    auth.js              # OTP, PIN, refresh, logout
    users.js             # /users/me, profile, loyalty
    wallet.js            # wallet + transactions
    agents.js            # agent profile, float, alerts, customers
    tariffs.js           # admin tariff CRUD
    offices.js           # community offices
    households.js        # masterdata capture + edit
    billing.js           # readings, invoice generation, receipt HTML, cash collections
    settlements.js       # submit + office confirm
    notifications.js     # subscribe, inbox, test
    support.js           # tickets, messages, roles, RBAC admin
    products.js          # WiFi vouchers + prepaid electricity (legacy)
    admin.js             # dashboard stats, user list, audit logs
```
