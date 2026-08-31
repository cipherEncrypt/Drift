# Drift — Project Brief

Read this first. Then read `docs/ARCHITECTURE.md`. Do not invent a different product.

## Where we are

We are building **Drift** for **Nimiq Mini Apps Competition Cycle II**.
Cursor implements. Architecture is already decided. Follow the docs. Do not reopen the idea.

## The hackathon

Official hub: https://miniappscompetition.com
Rules: https://miniappscompetition.com/rules
Scoring: https://miniappscompetition.com/scoring
Starter kit: https://miniappscompetition.com/starterkit
Mini Apps docs: https://nimiq.dev/mini-apps and https://www.nimiq.com/developers/mini-apps/overview
Tutorial: https://www.nimiq.com/developers/mini-apps/mini-app-tutorial
API: https://www.nimiq.com/developers/mini-apps/api-reference
Demo repo: https://github.com/Eligioo/nimiq-mini-app-demo
SDK: `@nimiq/mini-app-sdk`

Cycle II: **24 August 2026 – 18 September 2026, 23:59 UTC**
Prizes: **$10,000 / $5,000 / $2,000 USDT**, paid in three monthly instalments
Eligibility: 18+, solo or team of up to 5, one submission per team, public GitHub, MIT license
Open worldwide; prizes cannot be paid to OFAC-restricted jurisdictions

A Mini App is **not** a store app and **not** a standalone wallet.
It is a **website that opens inside Nimiq Pay** in a WebView.
Nimiq Pay injects `window.nimiq` and `window.ethereum`.
We use `@nimiq/mini-app-sdk` `init()` for NIM.
We never hold user private keys.
Sends and signatures show a native Nimiq Pay confirm dialog.

Hard requirements:
- Must run inside Nimiq Pay
- Must use the Mini Apps Framework as a real part of the product
- Must support **NIM or USDT**. We use **NIM**
- Fully working on first try, not a mockup
- Public MIT repo, no secrets in git
- Simple onboarding, phone-first, under 60 seconds
- Test inside Nimiq Pay, not Chrome
- Week 3 submissions go public for community testing

Scoring (105 pts): Design & UX 25, Functionality 25, Usefulness & originality 25, Marketing 25, Bonus 5.
Design includes first impression, visuals, navigation, mobile, onboarding under 60 seconds.

Do not clone Cycle 1 winners or the saturated pile:
Nimiq Space, NimJump, NimQuest, tip jars, bill splitters, invoices, savings circles, habit-stake apps.

Winning shape: one clear mechanic, real NIM actions, works on a phone, easy to demo.

## The product

**Name:** Drift  
**Line:** Paper planes with NIM.

You send money as a paper plane on a map.

**Private mail (default)**
- Write a short sealed note
- Pick one Nimiq address
- Send NIM straight to that address
- Plane flies A → B on the map
- Only that wallet can open the note
- Other people can watch the plane, not the letter
- Destination cannot change
- Nobody can steal the NIM or the note

**Cheer**
- A stranger adds extra NIM to the same recipient
- They cannot read the note
- Stamp: “Amina added 2 NIM”

**Relay**
- A stranger pays a small NIM fee to the same recipient
- Flight arrives faster (`arrivesAt` moves earlier)
- They cannot reroute or read the note
- Stamp: “Kwame relayed”

**Postcard (separate button)**
- Public game, not private mail
- Label: “Postcard — anyone can catch this”
- Hovers over the throw city, does not fly A → B
- First valid signed claim wins the NIM
- Thrower can be offline
- Paid from one disclosed treasury wallet (only custodial piece)
- Cheer/Relay are private-only, never on postcards

Compose screen:
- Big button: **Send privately**
- Small button: **Throw a postcard**

Private planes look closed/locked.
Postcards look open and clearly labeled.
A new user must tell them apart in one second.

Rejected on purpose: mid-flight hijack, changing destination, mixing postcard rules into private mail.

## How money works

Private / Cheer / Relay: **non-custodial**.
Sender signs `sendBasicTransaction` or `sendBasicTransactionWithData` **to the recipient**.
Chain holds the truth that NIM moved.
Our backend holds the story: sealed note, flight times, cheers, relays.

Claim on a private plane does **not** move money again.
It only unlocks the note after `sign("claim:<planeId>")` proves the claimant is `toAddress`.

Postcard: thrower sends NIM to the disclosed treasury.
First valid claim: Worker pays the catcher from that treasury.
Treasury key lives in Cloudflare Worker secrets only.

Amounts stored as **luna integers**. Confirm `1 NIM = 100_000 luna` against current docs in Phase 0.

## Stack (locked)

- Vite + React + TypeScript
- `@nimiq/mini-app-sdk`
- Leaflet
- Cloudflare Workers + D1
- Frontend host: Cloudflare Pages or Vercel (HTTPS)
- No Next.js SSR, no React Native, no Hub API as the main wallet path

## Docs in this repo

- `docs/BRIEF.md` — this file (hackathon + product)
- `docs/ARCHITECTURE.md` — system design, APIs, phases, risks
- `docs/NIMIQ_API.md` — create in Phase 0 with quoted real method signatures

If BRIEF and ARCHITECTURE disagree on a tiny detail, ARCHITECTURE wins for implementation, except product rules in BRIEF never change.

## How Cursor should work

1. Read BRIEF + ARCHITECTURE
2. Implement only the current phase
3. Stop at that phase’s exit checklist
4. Do not start the map before Phase 1 works
5. Do not add chat, profiles, USDT, intercept, or extra screens
6. Prefer boring working code over clever chain tricks

## Phases

- Phase 0 Foundation: app opens in Nimiq Pay, shows wallet address
- Phase 1 Private send + claim
- Phase 2 Sky + flight map
- Phase 3 Cheer + Relay
- Phase 4 Postcard
- Phase 5 Polish, demo video, submit

Current instruction: wait for the human to name the phase. Default if they say “start” is **Phase 0 only**.
