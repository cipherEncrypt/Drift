# Drift

Drift is a Mini App inside Nimiq Pay. Paper planes with NIM.

Phase 0: open it in Pay and you should see your NIM address.

Nimiq Pay often rejects plain `http://` LAN URLs ("could not open mini app"). Use HTTPS for the reliable path.

## Setup

```bash
npm install
```

## Test path A: local LAN (may fail in Pay)

```bash
npm run dev
```

Same as `npm run dev -- --host`. Vite binds port 5173 on all interfaces.

1. Phone and laptop on the same Wi-Fi.
2. Copy the **Network** URL from the terminal (not `localhost`), e.g. `http://192.168.1.42:5173`.
3. Nimiq Pay → Mini Apps → paste that URL.

If Pay says "could not open mini app", use path B. HTTP LAN is hit or miss.

Chrome will show "No Nimiq provider." That is expected outside Pay.

## Test path B: HTTPS (recommended)

Build a static site and deploy `dist/`.

```bash
npm run build
```

Output is `dist/`. Deploy with Cloudflare Pages or Vercel.

### Cloudflare Pages

First time only:

```bash
npx wrangler login
npx wrangler pages project create drift --production-branch main
```

Deploy:

```bash
npm run deploy:pages
```

Wrangler prints a URL like `https://drift.pages.dev` or `https://abc123.drift.pages.dev`.

### Vercel

First time only:

```bash
npx vercel login
```

Deploy:

```bash
npm run deploy:vercel
```

Vercel prints a URL like `https://drift.vercel.app`.

### Open in Nimiq Pay

Paste the HTTPS URL in Mini Apps:

`https://YOUR_DOMAIN`

Or use the Nimiq Pay deeplink (domain only, no `https://`):

`https://nimpay.app/miniapps/open/YOUR_DOMAIN`

Examples if your site is `https://drift.pages.dev`:

- Mini Apps field: `https://drift.pages.dev`
- Deeplink: `https://nimpay.app/miniapps/open/drift.pages.dev`

Approve the account prompt. You should see your NIM address.

## What works now

- `init` + `listAccounts` via `@nimiq/mini-app-sdk`
- One screen showing your address
- Static production build in `dist/`
- Worker stub: `npm run worker:dev`, then `curl http://localhost:8787/health`

Not built: send, claim, map, cheer, relay, postcard, D1.

## Docs

- `docs/BRIEF.md` product and hackathon rules
- `docs/ARCHITECTURE.md` system design and phases
- `docs/NIMIQ_API.md` Nimiq SDK signatures we verified
