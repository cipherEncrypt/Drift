# Drift — Architecture

Paper planes with NIM, built as a Nimiq Mini App for the Nimiq Mini Apps
Competition, Cycle II (24 Aug – 18 Sep 2026, 23:59 UTC).

Status: **approved design, pre-implementation**. This document is the
source of truth. Do not reopen product scope or dates here — see
`PRODUCT.md` (not included in this doc) for the pitch. This file is
system design only.

---

## 0. Product lock (context, not up for debate here)

- **Private plane**: sealed note, NIM sent direct to recipient on-chain,
  only that wallet can ever open the note.
- **Cheer**: anyone adds NIM to the same recipient, cannot read the note.
- **Relay**: anyone pays a NIM fee to the same recipient, shortens flight
  time in-app, cannot reroute, cannot read the note.
- **Postcard**: public, first valid claim wins the NIM, thrower can be
  offline when it's caught.
- No mid-flight theft. No changing a private destination. No mixing
  postcard rules into private mail.
- Stack: Vite + React + TS, `@nimiq/mini-app-sdk`, Leaflet, Cloudflare
  Workers + D1, HTTPS host (Cloudflare Pages or Vercel).
- Private / Cheer / Relay = **non-custodial**. Postcard = **one
  disclosed payout wallet**, key only in server secrets.
- Deadline: 18 Sep 2026, 23:59 UTC.

---

## 1. System context

**Who talks to whom**

- **User's phone** runs Nimiq Pay. Inside it, a WebView loads Drift's
  frontend over HTTPS.
- **Drift frontend** (Vite/React) talks to two things only: (a) the
  injected `window.nimiq` provider via `@nimiq/mini-app-sdk`, and (b)
  our own Worker API over `fetch`.
- **Drift Worker** (Cloudflare Workers) is the only thing that talks to
  D1. The frontend never touches D1 directly.
- **Nimiq chain**: the frontend never talks to it directly either — all
  chain interaction is mediated by Nimiq Pay via the injected provider.
  The Worker does not talk to the chain directly in Phases 1–3 (it
  trusts the client-reported tx hash, guarded by a uniqueness
  constraint); optional verification against a public Nimiq RPC is
  scoped into Phase 5 hardening, not assumed to exist earlier.

**What we store vs. what the chain stores**

- **Chain stores**: the actual NIM transfer (sender → recipient),
  amount, tx hash, block inclusion. This is ground truth for "did money
  move."
- **We store (D1)**: everything the chain doesn't know — sealed note
  text, flight metadata (coordinates, timestamps, ETA), cheer/relay
  history, postcard claim state, and (postcard only) which disclosed
  wallet paid out.
- The chain has no concept of a "plane." Drift is a narrative layer on
  top of plain NIM sends.

**Trust boundaries**

A malicious user **can**:
- Read all public plane metadata (path, amounts, cheer/relay counts) —
  nothing sealed is ever exposed there.
- Attempt to forge a claim signature — must fail verification.
- Attempt to double-catch a postcard, or race another claimer — must be
  blocked by an atomic state transition.
- Spam cheer/relay/postcard endpoints — each requires a real on-chain
  send first, so spam costs real NIM; endpoint-only spam (fake tx
  hashes) is blocked by a uniqueness constraint on `txHash`.

A malicious user **cannot**:
- Open a private note without controlling the recipient's private key
  (signature check is server-side and non-bypassable from the client).
- Redirect a plane's destination — `toAddress` is immutable once
  created; the chain enforces the real transfer target.
- Make the server release NIM it doesn't hold, in the private/cheer/
  relay paths — those are non-custodial, so there is nothing to steal.
- Drain the postcard payout wallet without the server's private key,
  which lives only in Worker secrets, never in the repo or the client
  bundle.

---

## 2. Architecture diagram

```
+-------------------------------------------------------------------+
|                       Nimiq Pay (native app)                      |
|  +---------------------------------------------------------------+|
|  |              WebView: Drift Mini App (HTTPS)                  ||
|  |                                                                ||
|  |   +-------------+   +--------------+   +-------------------+  ||
|  |   |  UI Screens  |-->|  nimiq.ts    |-->|   window.nimiq    |  ||
|  |   | Sky/Compose/ |   |  wallet      |   | (injected by      |  ||
|  |   | Detail/Inbox |   |  adapter:    |   |  Nimiq Pay)        |  ||
|  |   | /Claim       |   |  init(),     |   +---------+---------+  ||
|  |   +------+-------+   |  listAccts,  |             |            ||
|  |          |           |  send, sign  |             v            ||
|  |          |           +--------------+   [native confirm        ||
|  |          |                               dialog; user           ||
|  |          v                               approves send/sign]    ||
|  |   +-------------+                                               ||
|  |   | API client   |                                              ||
|  |   |  (fetch)     |                                              ||
|  |   +------+-------+                                              ||
|  +----------+-----------------------------------------------------+|
+-------------+-------------------------------------------------------+
              | HTTPS
              v
   +-------------------------------------------------+
   |          Cloudflare Worker (Drift API)           |
   |  +-----------+ +-----------+ +-----------------+ |
   |  | /planes   | | /claim    | | /cheer /relay   | |
   |  | /sky      | | (sig      | | (record only -  | |
   |  | /:id      | |  verify)  | |  tx already sent | |
   |  | /inbox    | |           | |  client-side)     | |
   |  +-----+-----+ +-----+-----+ +--------+----------+ |
   |        |             |                |            |
   |        |      +------v------+          |            |
   |        |      | Postcard    |          |            |
   |        |      | payer       |          |            |
   |        |      | (holds one  |          |            |
   |        |      | disclosed   |          |            |
   |        |      | treasury    |          |            |
   |        |      | key, sends  |          |            |
   |        |      | payout NIM  |          |            |
   |        |      | on catch)   |          |            |
   |        |      +-------------+          |            |
   |        v                                v           |
   |  +-----------------------------------------------+  |
   |  |                 D1 (SQLite)                    |  |
   |  |  planes | cheers | relays | claims             |  |
   |  +-----------------------------------------------+  |
   +---------------------+-----------------------------+
                          | (optional, Phase 5 hardening)
                          v
              +-----------------------+
              | Nimiq public RPC/API   |
              | (verify tx hash really |
              |  exists & matches      |
              |  amount/to before      |
              |  trusting client claim)|
              +-----------------------+

Map / flight clock:
Client-side Leaflet renders plane position by interpolating between
server-issued launchedAt and arrivesAt timestamps — no server push
needed, just a re-render on a client timer.
```

---

## 3. Data design

**Unit decision**: store all amounts as **`amountLuna`** (integer,
represented as a string for bigint safety in JSON/D1). 1 NIM =
100,000 luna. `VERIFY IN PHASE 0` — reconfirm this conversion factor
against current docs before relying on it; it is taken from the
official demo repo, not re-verified live at time of writing.

```typescript
type PlaneMode = 'private' | 'postcard';

type PlaneStatus =
  | 'created'    // row exists, waiting for on-chain confirmation
  | 'in_flight'  // tx confirmed, timer running
  | 'landed'     // timer elapsed, unclaimed/unopened (still openable)
  | 'opened'     // private: recipient claimed the note
  | 'caught'     // postcard: someone claimed the pot
  | 'tx_rejected'; // sender's wallet rejected/failed the send

// NOTE: 'claim_invalid' deliberately does NOT exist on Plane.
// A forged or wrong-address claim attempt must never be able to
// mutate a plane's own status. Failed attempts are recorded only
// on the Claim row (see Claim.result below), so a bad-faith
// claim attempt can't lock out the legitimate recipient.

interface Plane {
  id: string;                          // uuid
  mode: PlaneMode;
  fromAddress: string;                 // sender Nimiq address
  toAddress: string | null;            // fixed for private; null for
                                        // postcard until caught
  amountLuna: string;                  // bigint as string
  note: string | null;                 // private mode only; NEVER
                                        // returned by any public
                                        // endpoint, only by a
                                        // successful /claim
  txHash: string;                      // original send's tx hash
  status: PlaneStatus;
  launchedAt: string;                  // ISO timestamp
  arrivesAt: string;                   // ISO timestamp; server-
                                        // computed, shrinks on relay
  fromLatLng: [number, number];
  toLatLng: [number, number] | null;   // postcard may have no fixed
                                        // destination point
  createdAt: string;
}

interface Cheer {
  id: string;
  planeId: string;
  fromAddress: string;
  amountLuna: string;
  txHash: string;
  createdAt: string;
}

interface Relay {
  id: string;
  planeId: string;
  fromAddress: string;
  amountLuna: string;
  txHash: string;
  timeSavedMs: number;
  createdAt: string;
}

interface Claim {
  id: string;
  planeId: string;
  claimantAddress: string;
  signature: string;                   // signed "claim:<planeId>"
  result: 'opened' | 'caught' | 'rejected';
  createdAt: string;
}

// Structural guarantee that public responses can never carry a note.
type PublicPlane = Omit<Plane, 'note'>;
```

**Indexes**

- `planes(status, arrivesAt)` — sky view: in-flight planes sorted by ETA.
- `planes(toAddress)` — inbox view.
- `planes(fromAddress)` — optional "my sent planes" view.
- `cheers(planeId)`, `relays(planeId)` — plane detail history.
- `claims(planeId)` — abuse monitoring, not used for the double-catch
  guard itself (that's an atomic `UPDATE`, see §5).

**Public vs. sealed**

- `/sky` and `GET /planes/:id` always query an explicit column list
  that excludes `note` — never `SELECT *` on `planes` for any public
  route. Enforced via a `toPublicPlane()` serializer, not convention
  alone.
- Postcards never populate `note` at all — there's nothing to seal.

---

## 4. Money flows

### Private send + claim

```
Sender App     Nimiq Pay      Drift Worker     D1        Recipient App
   |               |               |            |               |
   |--sendBasicTx->|               |            |               |
   |  (or WithData)| [confirm]     |            |               |
   |               |--executes---->|            |               |
   |<---txHash-----|               |            |               |
   |                               |            |               |
   |--POST /planes---------------->|            |               |
   |  {to, amountLuna, note,       |--INSERT--->|               |
   |   txHash, fromLatLng,         |  created   |               |
   |   toLatLng}                   |            |               |
   |                               |--UPDATE--->|               |
   |                               |  in_flight |               |
   |<--plane object-----------------|            |               |
   |                                                              |
   .   . (time passes; plane visible in /sky without note)  .   .
   |                                                              |
   |                                             opens Inbox      |
   |                               |<--GET /inbox?address=recip---|
   |                               |--list (no note)------------->|
   |                                             taps plane       |
   |                               |<--GET /planes/:id------------|
   |                               |--"tap to open"--------------->|
   |                                             sign("claim:<id>")|
   |               |  [native confirm for signing]  |             |
   |                               |<--POST /planes/:id/claim-----|
   |                               |  {signature}   |             |
   |                               |--verify sig recovers to------|
   |                               |  toAddress                   |
   |                               |--UPDATE status: opened------>|
   |                               |--return {note}--------------->|
```

The NIM already arrived the moment the sender's transaction confirmed
on-chain. Claiming only unlocks the sealed *note* — it never moves
money. A plane can sit `landed` and unopened indefinitely with funds
already safe in the recipient's wallet.

### Cheer

```
Cheerer App    Nimiq Pay      Drift Worker     D1
   |--sendBasicTx(to=plane.toAddress)--------->|
   |               |[confirm]      |            |
   |<---txHash-----|               |            |
   |--POST /planes/:id/cheer------------------->|
   |  {fromAddress, amountLuna, txHash}         |--INSERT--->|
   |<---updated plane / cheer list---------------|            |
```

No note access at any point — cheer never touches `/claim`.

### Relay

```
Relayer App    Nimiq Pay      Drift Worker     D1
   |--sendBasicTx(to=plane.toAddress)--------->|
   |               |[confirm]      |            |
   |<---txHash-----|               |            |
   |--POST /planes/:id/relay-------------------->|
   |  {fromAddress, amountLuna, txHash}          |--INSERT--->|
   |                                              |--UPDATE--->|
   |                                              |  arrivesAt |
   |                                              |  (minus    |
   |                                              |  timeSavedMs)
   |<---updated plane (new ETA)-------------------|            |
```

Same non-custodial shape as Cheer, plus a server-side mutation of
`arrivesAt`. The fee goes to the recipient (v1 rule, unchanged). Relay
is entirely app-layer (ETA math), never chain-layer.

### Postcard throw + catch

Two custody options were considered; **Option B (one disclosed
treasury wallet) is the locked choice**, per product lock, not
reopened here:

- *Rejected*: a fresh custodial keypair per postcard, handed to the
  first claimant. Rejected because it means holding many short-lived
  keys — a larger custody surface, not a smaller one.
- *Chosen*: thrower sends NIM to one disclosed Drift-controlled
  treasury wallet. First valid claimant triggers a server-initiated
  payout **from that treasury** to their address.

```
Thrower App   Nimiq Pay   Drift Worker   D1      Postcard Payer  Catcher App
   |--sendBasicTx(to=treasury)-->|          |            |             |
   |             |[confirm]      |          |            |             |
   |<---txHash---|               |          |            |             |
   |--POST /planes---------------->|          |            |             |
   |  {mode:postcard, amountLuna,  |--INSERT->|            |             |
   |   txHash}                     |in_flight |            |             |
   |                                                                     |
   .  .  . (visible in /sky as catchable, no fixed "to")  .  .  .        |
   |                                                          sees postcard
   |                                |<--GET /planes/:id------------------|
   |                                |--sign("claim:<id>")---------------->|
   |                                |<--POST /planes/:id/claim------------|
   |                                |  {signature, claimantAddress}       |
   |                                |--verify sig------->|                |
   |                                |--ATOMIC:           |                |
   |                                |  UPDATE planes     |                |
   |                                |  SET status=caught |                |
   |                                |  WHERE id=? AND    |                |
   |                                |  status='in_flight'|                |
   |                                |  (0 rows -> 409     |                |
   |                                |   already caught)  |                |
   |                                |--if 1 row---------->|                |
   |                                |                     |--send NIM---->|
   |                                |<--payout txHash------|                |
   |                                |--UPDATE plane with payout tx--------->|
   |                                |--return {caught:true, amount}-------->|
```

The atomic conditional `UPDATE` (checked by rows-affected, never a
prior `SELECT`) is what prevents double-catch. This is the core
mechanism satisfying "first valid claim wins, no gambling."

---

## Plane state machine

```
created --(tx verified on chain)--> in_flight --(timer elapses)--> landed
   |                                    |                              |
   |(tx never confirms/fails)           |(private: valid claim)        |(private: valid
   v                                    v                              | claim, even
tx_rejected                          opened                            | after landing)
                                                                        v
in_flight --(postcard: valid claim, atomic)--> caught             opened

Failed claim attempts (bad signature, wrong address on a private
plane, or a postcard already caught) are recorded as a Claim row
with result:'rejected' and DO NOT mutate Plane.status. This is
deliberate: a forged claim attempt must never be able to knock a
legitimate plane into a broken state or lock out the real recipient.
```

---

## 5. API contract

### `POST /planes`
Create a plane after an on-chain send has already happened.
- **Auth**: none — Nimiq Pay's native confirmation dialog is the real
  gate; this endpoint only records a send that already occurred.
- **Body**: `{ mode, fromAddress, toAddress?, amountLuna, note?, txHash, fromLatLng, toLatLng? }`
- **Response**: `201 { plane: PublicPlane }`
- **Errors**: `400` malformed body; `409` if `txHash` already used
  elsewhere (idempotency/replay guard); `422` if optional chain
  verification of `txHash` fails (Phase 5+ only).

### `GET /planes/sky`
Public list for the map.
- **Auth**: none.
- **Query**: `?status=in_flight` optional.
- **Response**: `200 { planes: PublicPlane[] }` — `note` is excluded
  at the query level, not filtered after the fact.
- **Errors**: generic `500` only.

### `GET /planes/:id`
Single plane metadata.
- **Auth**: none.
- **Response**: `200 { plane: PublicPlane, cheers: Cheer[], relays: Relay[] }`
- **Errors**: `404` not found.

### `POST /planes/:id/claim`
Unlock a private note, or win a postcard.
- **Auth**: signature-based, not session-based.
- **Body**: `{ claimantAddress, signature }`, where `signature` signs
  the literal string `claim:<planeId>`.
- **Verification**:
  1. Recover the signing address from `signature` over
     `claim:<planeId>`; confirm it equals `claimantAddress`.
  2. If `mode === 'private'`: confirm `claimantAddress === plane.toAddress`,
     else `403`.
  3. If `mode === 'postcard'`: no address restriction — any valid
     signature qualifies. Run the atomic `UPDATE ... WHERE status =
     'in_flight'` here; `0` rows affected means `409`.
- **Response**: `200 { note }` (private) or
  `200 { caught: true, amountLuna, payoutTxHash }` (postcard).
- **Errors**: `403` bad signature/wrong address; `409` postcard
  already caught; `404` not found.

### `POST /planes/:id/cheer`
- **Auth**: none beyond an already-executed real transaction.
- **Body**: `{ fromAddress, amountLuna, txHash }`
- **Response**: `201 { cheer: Cheer }`
- **Errors**: `404` not found; `400` if the plane is a postcard
  (see open question §10.1 — this is an inferred rule, not explicitly
  stated in product lock).

### `POST /planes/:id/relay`
- **Auth**: none beyond an already-executed real transaction.
- **Body**: `{ fromAddress, amountLuna, txHash }`
- **Response**: `201 { relay: Relay, newArrivesAt: string }`
- **Errors**: `404` not found; `400` if plane already `landed` /
  `opened` / `caught`.

### `GET /inbox?address=<addr>`
- **Auth**: none — the sensitive part (the note) still requires a
  signed claim regardless of how the plane was found.
- **Response**: `200 { planes: PublicPlane[] }` filtered to
  `toAddress === address`.

**Double-catch prevention**: a single atomic conditional `UPDATE`
(`UPDATE planes SET status='caught', ... WHERE id=? AND status='in_flight'`),
checked by rows-affected — D1/SQLite supports this natively. Never a
`SELECT` followed by a separate `UPDATE`.

**How sky strips notes**: explicit column selection plus a
`toPublicPlane()` serializer, backed by the `PublicPlane` type so the
compiler helps catch accidental leaks.

---

## 6. Frontend structure

```
src/
  lib/
    nimiq.ts           # wallet adapter: init, listAccounts, sendNim, signClaim
    api.ts             # typed fetch wrapper for all Worker endpoints
    luna.ts            # NIM <-> luna conversion + formatting helpers
    flightClock.ts     # given launchedAt/arrivesAt, compute progress 0..1
  types/
    plane.ts           # Plane, Cheer, Relay, Claim, PublicPlane
  screens/
    Sky.tsx            # map + compose button
    Compose.tsx        # private vs postcard, two-action layout
    PlaneDetail.tsx    # path, ETA, cheer/relay buttons, history
    Inbox.tsx          # planes addressed to me
    Claim.tsx          # note reveal / postcard catch result
  components/
    Map/
      SkyMap.tsx       # Leaflet wrapper
      PlaneMarker.tsx  # single plane's animated position
    PlaneCard.tsx      # summary card used in Sky/Inbox lists
    SendPrivatelyButton.tsx
    ThrowPostcardButton.tsx  # visually distinct, warning copy
  hooks/
    useNimiqProvider.ts   # wraps init(), exposes ready/address state
    usePlane.ts           # fetch + poll a single plane
    useSky.ts             # fetch + poll the public list
    useFlightProgress.ts  # ties flightClock.ts to a re-render tick
  App.tsx
  main.tsx
```

**Flight time computation**: the client never owns the clock.
`launchedAt` and `arrivesAt` are server-issued ISO timestamps on the
Plane row. The client computes
`progress = (now - launchedAt) / (arrivesAt - launchedAt)` on every
render tick, clamped to `[0,1]`. When Relay fires, the server returns
a new `arrivesAt`; the client just re-fetches and the calculation
self-corrects. No client/server clock-skew trust issue, since the
server's timestamps are authoritative and the client only interpolates
for animation smoothness.

**Private vs. postcard visual distinction**: private planes render as
a closed/folded paper-plane icon with a lock glyph. Postcards render
as an open/flat icon, a visually distinct color/outline, and the
literal label "Postcard — anyone can catch this" always visible on
card and detail views (not hidden behind a tooltip). Compose screen:
"Send privately" is the large primary action; "Throw a postcard" is a
small secondary action that shows a one-line warning ("Anyone can
catch this — no note, no takebacks") before proceeding.

---

## 7. Security + competition compliance

- **No secrets in repo**: postcard treasury private key lives in
  Cloudflare Worker secrets (`wrangler secret put`), never committed,
  never in the client bundle. `.env.example` documents variable
  *names* only.
- **No custody except postcard**: private/cheer/relay never touch a
  server-held key, by construction (§4).
- **MIT license**: `LICENSE` at repo root, `package.json` `license`
  field set.
- **Env vars**: `NIMIQ_NETWORK` (mainnet/testnet),
  `POSTCARD_TREASURY_PRIVATE_KEY` (secret),
  `POSTCARD_TREASURY_ADDRESS` (public, fine in code), D1 binding
  config in `wrangler.toml` (not sensitive).
- **Rate limits / abuse**: every cheer/relay/postcard-throw requires a
  real on-chain send first, so spam already costs an attacker real
  NIM. Remaining risk is endpoint-only spam with a fake or reused
  `txHash` — mitigated by a uniqueness constraint on `txHash` across
  the whole system. Full on-chain verification of each `txHash`
  (matching amount and recipient) is more correct but adds latency and
  a dependency; scoped into Phase 5 hardening rather than shipped from
  day one — a disclosed tradeoff, not a silent gap.
- **`requestDeviceIdentifier`: skipped for v1.** It's built for
  anti-spam/leaderboards/save-slots, but Drift's real abuse surface is
  already gated by "you must have sent real NIM" for cheer/relay, and
  postcard's risk is claim-race timing, not device fingerprinting — a
  device ID wouldn't stop a bot from claiming a postcard instantly. It
  also adds a permission prompt that works against the sub-60-second
  onboarding goal. Reconsider only if postcard-sniping bots become a
  real problem during Week 3 public testing.

---

## 8. Build phases

### Phase 0 — Foundation
- **Goal**: Drift opens inside Nimiq Pay and can read the connected
  wallet's address.
- **Creates**: repo scaffold (Vite+React+TS); `wrangler.toml` + an
  empty Worker deployed to a real HTTPS URL; `src/lib/nimiq.ts` with
  `init()` + `listAccounts()`; minimal `App.tsx` displaying the
  connected address.
- **Demo on phone**: open the URL inside Nimiq Pay's Mini Apps section,
  see your own Nimiq address on screen.
- **Out of scope**: any UI beyond a debug screen, D1 tables, sending.
- **Estimate**: 1–2 days.
- **Exit checklist**:
  - [ ] Deployed frontend reachable over HTTPS
  - [ ] Opens without error inside actual Nimiq Pay (not just Chrome)
  - [ ] `init()` resolves; `listAccounts()` returns a real address
  - [ ] `sendBasicTransaction`/`sign` method signatures reverified
        against current docs (not assumed from this document alone)

### Phase 1 — Private send + claim
- **Goal**: one person sends a sealed private plane to another real
  wallet, and that recipient can open it.
- **Creates**: D1 `planes` table (private-relevant columns);
  `POST /planes`; `GET /planes/:id`; `GET /inbox`;
  `POST /planes/:id/claim`; `Compose.tsx` (private path only);
  `Inbox.tsx`; `Claim.tsx`; `nimiq.ts` additions for
  `sendBasicTransactionWithData` / `sign`.
- **Demo on phone**: two physical wallets. Wallet A sends a sealed NIM
  plane to Wallet B. Wallet B opens Inbox, taps the plane, signs a
  claim, sees the note.
- **Out of scope**: map, cheer, relay, postcard, flight animation.
- **Estimate**: 3–4 days.
- **Exit checklist**:
  - [ ] Real NIM moves on-chain, sender to recipient
  - [ ] Note is retrievable only via a valid signed claim from the
        correct address
  - [ ] Wrong-address claim attempt rejected with `403`
  - [ ] `note` never appears in any response except a successful claim

### Phase 2 — Sky + flight map
- **Goal**: planes are visible in motion on a public map; notes never
  exposed.
- **Creates**: `GET /planes/sky`; `SkyMap.tsx` + `PlaneMarker.tsx`
  (Leaflet); `flightClock.ts`; `useFlightProgress.ts`;
  `fromLatLng`/`toLatLng` capture in Compose.
- **Demo on phone**: open the app with no wallet interaction needed,
  see a plane animate across the map toward its destination with an
  ETA countdown. Tapping it shows metadata but no note.
- **Out of scope**: cheer, relay, postcard.
- **Estimate**: 3–4 days (Leaflet-in-WebView performance is a named
  risk — see §9).
- **Exit checklist**:
  - [ ] Sky loads and renders on a real phone inside Nimiq Pay without
        jank
  - [ ] Plane position updates smoothly over time
  - [ ] `/sky` response contains zero `note` fields, verified by
        inspection

### Phase 3 — Cheer + Relay
- **Goal**: third parties can add money or speed to someone else's
  private plane without reading it.
- **Creates**: `cheers`/`relays` D1 tables; `POST /planes/:id/cheer`;
  `POST /planes/:id/relay`; relay-driven `arrivesAt` mutation;
  cheer/relay UI on `PlaneDetail.tsx`; history stamps ("Amina added
  2 NIM").
- **Demo on phone**: Wallet C cheers the plane from Phase 1/2 (sends
  NIM, sees the total tick up), then relays it (sends a smaller fee,
  watches the ETA visibly drop).
- **Out of scope**: postcard.
- **Estimate**: 2–3 days.
- **Exit checklist**:
  - [ ] Cheer increases displayed total without exposing the note to
        the cheerer
  - [ ] Relay visibly shortens `arrivesAt`; map animation reflects it
  - [ ] Duplicate `txHash` reuse across cheer/relay/plane creation is
        rejected

### Phase 4 — Postcard
- **Goal**: a fully separate, clearly-labeled public claimable plane
  exists, with no double-catch possible.
- **Creates**: postcard treasury wallet + secret provisioning;
  postcard branch of `POST /planes` and `POST /planes/:id/claim`;
  atomic catch logic; `ThrowPostcardButton.tsx` with warning copy;
  distinct visual treatment on map/cards.
- **Demo on phone**: Wallet A throws a postcard (sends NIM to
  treasury); it appears on the sky, visually distinct from private
  planes. Wallet B catches it first; a simultaneous attempt from
  Wallet C is rejected with a clear "already caught" message. Wallet B
  receives a real payout transaction from the treasury.
- **Out of scope**: nothing further planned — last product feature.
- **Estimate**: 3–4 days (custody logic and the concurrency test
  deserve real care, not a rush).
- **Exit checklist**:
  - [ ] Two near-simultaneous claim attempts on the same postcard:
        exactly one succeeds
  - [ ] Postcard treasury key confirmed absent from git history
        (`git log -p` / secret-scan), not just absent from the current
        tree
  - [ ] Postcard UI distinguishable from private planes in under one
        second (informal test with someone unfamiliar with the app)

### Phase 5 — Polish, demo video, submit
- **Goal**: submission-ready.
- **Creates**: README (MIT, setup, architecture summary); demo video
  showing all four features end-to-end; onboarding-time check (<60s
  cold start on a real phone); empty-states ("No planes yet. Send the
  first one."); error-state polish; optional on-chain tx-hash
  verification hardening (§7).
- **Demo on phone**: the actual submission demo — full run-through,
  unscripted, on a phone that's never opened the app before.
- **Out of scope**: any new feature. Hardening and packaging only.
- **Estimate**: 3–5 days, plus buffer before the deadline for Week 3
  public early-access testing feedback (submissions go public at the
  start of Week 3 per official rules — this phase should not be
  crammed into the final 48 hours).
- **Exit checklist**:
  - [ ] Cold onboarding, unfamiliar phone, wallet already installed:
        under 60 seconds to first plane sent
  - [ ] Demo video shows: private send -> map flight -> cheer -> relay
        (ETA visibly drops) -> recipient opens note -> postcard thrown
        -> caught by someone else
  - [ ] No secrets anywhere in git history
  - [ ] MIT LICENSE present, repo public

**Total estimate**: roughly 15–22 focused days across Phases 0–5. This
fits inside the Aug 24 – Sep 18 window with room for the mandatory
Week 3 public-testing period, but the margin is real, not generous —
especially if Phase 4's concurrency handling or Phase 2's WebView map
performance surface genuine problems.

---

## 9. Risks

1. **Testing access to Nimiq Pay is unverified.** No official source
   found confirming an allowlist/TestFlight requirement — the official
   demo repo's flow was simply "enter your LAN URL directly."
   *Mitigation*: this is the first thing to test in Phase 0, hour one.
2. **Send/claim method shapes might differ subtly from what's assumed
   here.** *Mitigation*: re-fetch `nimiq.dev/mini-apps` and the demo
   repo fresh at the start of Phase 0, not from memory.
3. **Postcard hot wallet is a real custody and security surface** —
   the one place a bug or leaked key directly loses user funds.
   *Mitigation*: keep the treasury balance minimal, monitor it, give
   Phase 4 real scrutiny rather than rushing it as the "last" phase.
4. **WebView map performance.** Leaflet inside a mobile WebView (not a
   full browser) can be janky with many markers or heavy tile loads.
   *Mitigation*: cap simultaneous animated planes, use simple vector
   markers, test on a real low-end Android device early in Phase 2.
5. **Empty sky at first launch** is a bad first impression for the
   first judge or tester who opens the app. *Mitigation*: seed a few
   real, small-amount planes from the team's own wallets before public
   testing opens.
6. **Week 3 mandatory public visibility** means real strangers find
   bugs before the deadline, not after. *Mitigation*: phase order and
   estimates above are sequenced so Phase 4 (riskiest) finishes before
   Week 3 begins, not during it.
7. **Double-catch race condition on postcards** if the atomic
   conditional `UPDATE` isn't implemented correctly (e.g., an
   accidental SELECT-then-UPDATE). *Mitigation*: explicitly
   concurrency-tested in Phase 4's exit checklist with two
   near-simultaneous requests, not just reasoned about.
8. **Trusting client-reported `txHash` without on-chain verification**
   means a motivated attacker could report a fabricated hash.
   *Mitigation*: the `txHash` uniqueness constraint closes the
   cheapest attack; full chain verification is scoped into Phase 5,
   not skipped entirely, but shipped without it in Phases 1–3 — a
   disclosed tradeoff.

---

## 10. Open questions

1. **Can Cheer or Relay target a postcard, or only a private plane?**
   The product description frames both as acting on "the same
   recipient," but a postcard has no fixed recipient until caught.
   This document assumes cheer/relay are private-plane-only (API
   contract §5 rejects them on postcards with `400`) — this is an
   inference, not a stated rule, and needs explicit confirmation
   before Phase 3.
2. **Does a postcard need a destination point (`toLatLng`) at all**, or
   does it just hover in "the sky" with no landing target until
   caught? Affects whether Phase 2's map needs postcard-specific
   rendering before Phase 4 exists. Leaning toward "postcards
   hover/circle rather than travel point-to-point," but this is a
   design opinion pending confirmation.
3. **Postcard treasury funding model**: does the treasury only ever
   hold funds mid-transit (net zero — thrower in, winner out), or
   could delays leave it holding an accumulating balance that becomes
   a bigger target? This document assumes the payout happens
   synchronously within the same claim request — simplest, and matches
   "first valid claim wins" cleanly — but that's a decision made here,
   not one stated in the product lock, and deserves explicit sign-off.

Everything else was decidable from the existing product lock and has
been decided directly in this document (luna as the storage unit,
`claim_invalid` removed from `PlaneStatus`, `requestDeviceIdentifier`
skipped for v1, D1 as primary datastore).
