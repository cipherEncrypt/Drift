# Drift

Send NIM as paper planes. Open Drift inside **Nimiq Pay** on your phone.

You pick someone, attach a short sealed note, and send real NIM. The plane shows up on a live map. Only the recipient can open the note. Anyone watching can cheer (add NIM) or relay (speed it up) without ever seeing the message.

There is also a separate **postcard** mode: throw NIM into the open sky, first person to catch it wins.

Built for the [Nimiq Mini Apps Competition](https://miniappscompetition.com).

**Live app:** https://drift-tan-eight.vercel.app

**Open in Pay:**

```
nimiqpay://miniapp?url=https://drift-tan-eight.vercel.app
```

---

## How it works

**Send (private mail)**  
Pick a Nimiq address or `@username`, enter amount and note, confirm in Pay. NIM goes straight to them on-chain. The note stays on our server until they claim it.

**Inbox**  
Incoming planes land here. Tap one, sign a claim, read the note. Wrong wallet gets rejected.

**Sky**  
Map of planes in flight. You see amounts, routes, and ETAs. Notes never show on this screen.

**Cheer / Relay**  
Tap someone else's private plane. Cheer adds NIM to the recipient. Relay pays a small fee to make the plane arrive sooner.

**Postcard**  
Separate from private mail. Throw NIM to the treasury. First valid catch wins a payout. Needs treasury setup (see below).

**Extras**  
Usernames (`@cipher`), sent list with delivery status, QR code to prefill Send to your wallet, optional cheer word stamp.

---

## Stack

| Part | Tech |
|------|------|
| Frontend | Vite, React, TypeScript, Leaflet |
| Wallet | `@nimiq/mini-app-sdk` in Nimiq Pay |
| API | Cloudflare Worker |
| Database | Cloudflare D1 |
| Frontend host | Vercel |
| Chain | Nimiq mainnet |

Drift never holds your private keys. Sends and signatures go through Nimiq Pay's native confirm dialog.

---

## Local dev

Install deps:

```bash
npm install
```

**Terminal 1** (API + local D1):

```bash
npm run db:migrate:local
npm run worker:dev
```

**Terminal 2** (frontend, proxies `/api` to the worker):

```bash
npm run dev
```

Open the LAN URL shown in the terminal inside Nimiq Pay Discover.

Chrome alone will say "Open in Nimiq Pay." That is normal.

---

## Deploy

Frontend and API deploy separately.

### Frontend (Vercel)

Push to GitHub. Vercel picks up the build automatically.

Set this env var in Vercel:

```
DRIFT_API_URL=https://drift-api.driftplanes.workers.dev
```

The app also works through Vercel's `/api` proxy if `DRIFT_API_URL` is unset locally.

### API (Cloudflare Worker + D1)

First time only:

```bash
npx wrangler login
npx wrangler d1 create drift-db
```

Copy the `database_id` into `worker/wrangler.toml`, then:

```bash
npm run db:migrate
npm run worker:deploy
```

After any schema change, run `npm run db:migrate` before `npm run worker:deploy`.

`git push` does **not** deploy the worker. Run `npm run worker:deploy` yourself.

---

## Test in Nimiq Pay

Use two or three real wallets on a phone.

1. Open the app in Pay (HTTPS URL or deeplink above).
2. Claim a username if prompted (optional, can skip).
3. **Send:** send a small amount + note to wallet B.
4. **Sky:** watch the plane move. From wallet C, cheer or relay it.
5. **Inbox (wallet B):** tap the plane, sign claim, read the note.
6. **Send tab:** check your sent list shows In flight → Delivered → Opened.
7. **Postcard:** throw on Send, catch on Sky from another wallet (if treasury is funded).

---

## What works now

- Private send with on-chain NIM and sealed note
- Claim with wallet signature (`claim:<planeId>`)
- Sky map with in-flight planes (no notes on public routes)
- Cheer and relay on private planes
- Inbox with sections, progress, cheer totals
- Sent list for the sender
- Usernames with signed claim
- Plane-request QR in the header
- Postcard throw and catch (with treasury configured)
- Cheer word stamp on private planes

---

## Postcard treasury

Postcard throw stays hidden until `POSTCARD_TREASURY_ADDRESS` is set in `worker/wrangler.toml`. Catch and payout need the RPC URL and a private key secret too.

1. Create a dedicated Nimiq wallet for the treasury.
2. Set `POSTCARD_TREASURY_ADDRESS` and `NIMIQ_RPC_URL` in `worker/wrangler.toml`.
3. Store the private key as a Worker secret (never commit it):

   ```bash
   npx wrangler secret put POSTCARD_TREASURY_PRIVATE_KEY --config worker/wrangler.toml
   ```

4. Fund the treasury with enough NIM for catches.
5. Redeploy: `npm run worker:deploy`

Check status:

```bash
curl -s https://drift-api.driftplanes.workers.dev/config
```

You want `postcardThrowEnabled` and `postcardCatchEnabled` both `true`.

---

## Amounts

All amounts are stored as **luna** integers.

```
1 NIM = 100,000 luna
```

The Nimiq Pay SDK uses luna for send amounts too.

---

## Docs

- `docs/BRIEF.md` — product rules and hackathon context
- `docs/ARCHITECTURE.md` — system design, API, data model
- `docs/NIMIQ_API.md` — SDK method signatures we use

---

## License

MIT. See `LICENSE`.
