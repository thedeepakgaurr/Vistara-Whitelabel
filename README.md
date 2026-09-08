# CallDesk — White-Label AI Calling Platform

A standalone, self-hosted white-label platform built on top of **Vistara AI**.
This codebase has its own users, agents, campaigns, calls, and wallet — it is
completely independent of the Vistara AI app. It talks to Vistara AI only
through Vistara's public API and receives call outcomes via webhook.

Rebrand it by changing `NEXT_PUBLIC_BRAND_NAME` in `.env` (default: `CallDesk`).

## How it fits together

```
 Your client's dashboard/API  →  This platform (own DB)  →  Vistara AI  →  Telephony
        (this app)                                                            |
        ^                                                                     |
        |______________________ webhook: call outcome ________________________|
```

1. An **admin** (the white-label owner) signs in at `/admin`, creates **users**
   (their clients), sets each user's per-connected-minute and
   per-unconnected-call rate, and credits/debits their wallet.
2. The admin links **Vistara AI Agents** (created in the Vistara AI dashboard)
   into this platform via their Vistara Agent ID, and assigns each one to a user.
3. A **user** signs in at `/dashboard`, launches **campaigns** (CSV contact
   upload) or places ad-hoc calls, and gets their own **API key** to integrate
   programmatically (`POST /api/v1/calls`, mirroring Vistara AI's own external API).
4. This platform calls Vistara AI's `/api/v1/calls/initiate` using **one shared
   `VISTARA_API_KEY`** (this platform is a single Vistara AI account/tenant).
5. Vistara AI places the call and, when it ends, POSTs the outcome to the
   **webhook URL configured on that Agent in the Vistara AI dashboard**. This
   platform's `/api/webhook/vistara` receives it, matches it back to the local
   call by `vistara_call_id`, bills the owning user's wallet, and updates the
   campaign's aggregate stats.

**No changes are made to the Vistara AI codebase.** The only Vistara-AI-side
configuration required is step 5's webhook URL, set once per Agent.

## Required one-time setup per Vistara Agent

For every Agent you create in Vistara AI that you plan to link into this
platform, set its **webhook_url** (in the Vistara AI dashboard) to:

```
{APP_URL}/api/webhook/vistara?token={WEBHOOK_SHARED_SECRET}
```

using the values from this app's `.env`. Vistara AI's outbound webhook has no
signature — this shared-secret query token is how `/api/webhook/vistara`
authenticates the request. Without it, call outcomes will never reach this
platform and calls will stay stuck in "initiated".

## Getting started

```bash
npm install

# 1. Configure .env (copy from .env.example) — DB credentials, JWT_SECRET,
#    VISTARA_API_KEY, WEBHOOK_SHARED_SECRET.

# 2. Create the database + tables
npm run db:schema

# 3. Create the platform-owner admin account
SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD=ChangeMe123! npm run db:seed

# 4. Run it
npm run dev      # http://localhost:4000
```

Log in at `/login` with the seeded admin account, change the password (via
your MySQL client or by adding a change-password flow later — none is wired
up by default), then:

1. Go to **Agents** → link a Vistara AI Agent ID.
2. Go to **Users** → add a client, set their rates.
3. Assign the agent to that user (edit the agent, pick the user).
4. Provide the login credentials to the user, have them sign in at `/login`, and launch a
   campaign or grab their API key from **Developer**.

## Architecture

- **Next.js App Router**, single deployable app — no separate backend process.
- **MySQL** (`mysql2`) — schema in `scripts/schema.sql`. Tables: `users`,
  `agents`, `campaigns`, `calls`, `wallet_transactions`.
- **Auth**: JWT in an httpOnly cookie for the dashboard (`src/lib/auth.ts`,
  `src/lib/session.ts`), `x-api-key` header for the external `/api/v1/*` API.
  `src/proxy.ts` does fast redirect-based route gating; every page/route
  handler re-verifies against the DB (a deactivated account or role change
  takes effect immediately, not just on next token refresh).
- **Call dispatch** (`src/lib/queue.ts`): campaign contacts are inserted as
  `queued` calls; a claim-then-dispatch loop (MySQL `FOR UPDATE SKIP LOCKED`)
  respects `MAX_CONCURRENT_CALLS` and each user's wallet balance before
  calling Vistara AI. `src/instrumentation.ts` starts a periodic safety-net
  sweep on server boot in case a dispatch was missed.
- **Billing** (`src/lib/billing.ts`): connected calls are billed
  `ceil(duration / 60) * rate_per_connected_minute`; anything else is billed
  `rate_per_unconnected_call`. Webhook processing is idempotent — a call past
  the `queued`/`initiated` stage is never re-billed on a duplicate delivery.

## Environment variables

See `.env.example` for the full list with comments. The important ones:

| Variable | Purpose |
|---|---|
| `DB_*` | MySQL connection |
| `JWT_SECRET` | Session signing key |
| `VISTARA_API_KEY` | This platform's single Vistara AI API key |
| `VISTARA_API_BASE_URL` | Vistara AI's base URL |
| `WEBHOOK_SHARED_SECRET` | Query-token auth for the inbound webhook |
| `MAX_CONCURRENT_CALLS` | Platform-wide concurrent-dial cap |
| `NEXT_PUBLIC_BRAND_NAME` | Display name shown in the UI |
