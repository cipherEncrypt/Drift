# Drift

Drift is a Mini App inside Nimiq Pay. Paper planes with NIM.

Open in Pay and you should see Sky, Send, and Inbox.

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

**Note:** `git push` deploys the Vercel frontend only. The Worker is separate:

```bash
npm run worker:deploy
```

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

After schema changes, run `npm run db:migrate` before `npm run worker:deploy`. Frontend deploy is separate: `git push` (Vercel).

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
4. **Sky**: tap a private plane to cheer or relay (third wallet can cheer too).
5. **Postcard** (only if treasury is configured): throw on Send, catch on Sky.

Chrome shows "Open in Nimiq Pay." Expected.

## What works

- Private send: NIM goes to recipient on-chain; note stored server-side
- Claim: sign `claim:<planeId>`; only matching recipient gets the note
- Sky map: in-flight private planes (metadata only, no note on public routes)
- Cheer / relay: private planes only; NIM to `toAddress`; relay shortens ETA
- Inbox: incoming vs opened, flight progress, cheer totals, badge
- Sent list: sender sees In flight → Delivered → Opened
- Cheer word: optional one-word stamp on private planes
- Plane-request QR: My QR in the app bar opens a scan link to Send (not auto-pay)
- Postcard throw: NIM to treasury address from `GET /config`
- Postcard catch: atomic catch + treasury payout (when fully configured)

## Postcard treasury setup

Postcard is hidden until `POSTCARD_TREASURY_ADDRESS` is set. Catch stays hidden until payout secrets exist too.

1. Create a Nimiq wallet for the treasury.
2. In `worker/wrangler.toml` set `POSTCARD_TREASURY_ADDRESS` and `NIMIQ_RPC_URL`.
3. Set the private key as a Worker secret (never commit):

   ```bash
   npx wrangler secret put POSTCARD_TREASURY_PRIVATE_KEY --config worker/wrangler.toml
   ```

4. Fund the treasury with enough NIM for postcard catches.
5. Redeploy the worker: `npm run worker:deploy`

## Units

All amounts are **luna integers**. `1 NIM = 100,000 luna`.

## Docs

- `docs/BRIEF.md` product rules
- `docs/ARCHITECTURE.md` system design
- `docs/NIMIQ_API.md` Nimiq SDK signatures

## License

MIT. See `LICENSE`.
