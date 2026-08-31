# Drift

Drift is a Mini App inside Nimiq Pay. Paper planes with NIM.

Open in Pay and you should see Send and Inbox. Phase 1: private send + claim.

## Setup

```bash
npm install
```

## Local dev

Terminal 1, API + D1:

```bash
npm run db:migrate:local
npm run worker:dev
```

Terminal 2, frontend (proxies `/api` to worker):

```bash
npm run dev
```

Open the LAN URL in Nimiq Pay Discover, or use your Vercel URL with `DRIFT_API_URL` set.

## Deploy API (Cloudflare Worker + D1)

```bash
npx wrangler login
npx wrangler d1 create drift-db
```

Copy the `database_id` into `worker/wrangler.toml`, then:

```bash
npm run db:migrate
npm run worker:deploy
```

Note the worker URL, e.g. `https://drift-api.YOUR_SUBDOMAIN.workers.dev`

## Deploy frontend (Vercel)

Push to GitHub. In Vercel project settings add:

```
DRIFT_API_URL=https://drift-api.driftplanes.workers.dev
```

Redeploy. Open `https://drift-tan-eight.vercel.app` in Nimiq Pay.

Direct deeplink:

`nimiqpay://miniapp?url=https://drift-tan-eight.vercel.app`

## Test in Nimiq Pay

1. Open Drift in Pay (HTTPS URL or deeplink).
2. **Send**: pick recipient, amount, note. Confirm NIM send in Pay.
3. **Inbox** on recipient wallet: tap plane, sign, open note.

Chrome shows "Open in Nimiq Pay." Expected.

## What works now

- Private send (real NIM on-chain)
- Sealed note stored server-side
- Claim with signature (only recipient gets note)
- Wrong address or bad sig returns 403

Not built: map, cheer, relay, postcard.

## Docs

- `docs/BRIEF.md` product rules
- `docs/ARCHITECTURE.md` system design
- `docs/NIMIQ_API.md` Nimiq SDK signatures


 https://driftplanes.workers.dev