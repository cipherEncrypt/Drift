# Drift

Send NIM as paper planes. Open Drift inside Nimiq Pay on your phone.

You pick someone, attach a short sealed note, and send real NIM. The plane shows up on a live map. Only the recipient can open the note. Anyone watching can cheer (add NIM) or relay (speed it up) without seeing the message.

There is also a postcard mode: throw NIM into the open sky. First person to catch it wins.

Built for the [Nimiq Mini Apps Competition](https://miniappscompetition.com).

**Live demo:** https://drift-tan-eight.vercel.app

**Open in Pay:**

```
nimiqpay://miniapp?url=https://drift-tan-eight.vercel.app
```

Safari and Chrome cannot run Mini Apps. That is expected.

The sky map uses OpenStreetMap tiles. No Mapbox or Google Maps key.

## Local run

```bash
npm install
```

Terminal 1 (API + local D1):

```bash
npm run db:migrate:local
npm run worker:dev
```

Terminal 2 (frontend):

```bash
npm run dev
```

Open the LAN URL from the terminal inside Nimiq Pay Discover.

## Deploy

Frontend and worker are separate.

`git push` updates the Vercel app only. It does not deploy the Cloudflare Worker.

Worker:

```bash
npm run db:migrate
npm run worker:deploy
```

Optional Vercel env:

```
DRIFT_API_URL=https://drift-api.driftplanes.workers.dev
```

Postcard catch needs a Worker secret for the treasury key. Set it with `wrangler secret put POSTCARD_TREASURY_PRIVATE_KEY`. Never commit that key. The public treasury address and RPC URL can stay in `worker/wrangler.toml`.

## License

MIT. See `LICENSE`.
