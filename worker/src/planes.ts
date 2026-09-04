import type { Env } from './env'
import { getDb } from './env'
import {
  FLIGHT_MS,
  POSTCARD_HOVER_MS,
  applyLandedTransitions,
  cheersForPlane,
  getPlane,
  getPlaneWithNote,
  inboxPlanesEnriched,
  normalizeAddress,
  relayTimeSavedMs,
  relaysForPlane,
  rowToPublic,
  sentPlanes,
  shortenArrival,
  skyPlanes,
  txHashUsed,
} from './db'
import { sendTreasuryPayout, treasuryConfigured } from './postcardTreasury'
import {
  isValidLunaString,
  isValidTxHash,
  parseCheerWord,
  parseJsonBody,
  trimNonEmpty,
} from './validate'

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

function err(message: string, status: number): Response {
  return json({ error: message }, status)
}

interface CreatePlaneBody {
  mode?: string
  fromAddress?: string
  toAddress?: string
  amountLuna?: string
  note?: string
  txHash?: string
  fromLatLng?: [number, number]
  toLatLng?: [number, number]
}

interface ClaimBody {
  claimantAddress?: string
  signature?: string
  publicKey?: string
}

interface CheerRelayBody {
  fromAddress?: string
  amountLuna?: string
  txHash?: string
  word?: string
}

export async function handleInbox(url: URL, env: Env): Promise<Response> {
  const address = url.searchParams.get('address')
  if (!address) return err('address required', 400)

  const db = getDb(env)
  await applyLandedTransitions(db)
  const planes = await inboxPlanesEnriched(db, address)
  return json({ planes })
}

export async function handleSent(url: URL, env: Env): Promise<Response> {
  const address = url.searchParams.get('address')
  if (!address) return err('address required', 400)

  const db = getDb(env)
  await applyLandedTransitions(db)
  const planes = await sentPlanes(db, address)
  return json({ planes })
}

export async function handleSky(url: URL, env: Env): Promise<Response> {
  const status = url.searchParams.get('status') ?? 'in_flight'
  const db = getDb(env)
  await applyLandedTransitions(db)
  const planes = await skyPlanes(db, status)
  return json({ planes })
}

export async function handleGetPlane(id: string, env: Env): Promise<Response> {
  const db = getDb(env)
  await applyLandedTransitions(db)
  const row = await getPlane(db, id)
  if (!row) return err('not found', 404)

  const cheers = await cheersForPlane(db, id)
  const relays = await relaysForPlane(db, id)

  return json({
    plane: rowToPublic(row),
    cheers,
    relays,
  })
}

export async function handleConfig(env: Env): Promise<Response> {
  const treasuryAddress = trimNonEmpty(env.POSTCARD_TREASURY_ADDRESS)
  return json({
    postcardTreasuryAddress: treasuryAddress,
    postcardThrowEnabled: Boolean(treasuryAddress),
    postcardCatchEnabled: treasuryConfigured(env),
  })
}

function validateCheerRelayBody(body: CheerRelayBody): string | null {
  const fromAddress = trimNonEmpty(body.fromAddress)
  const amountLuna = trimNonEmpty(body.amountLuna)
  const txHash = trimNonEmpty(body.txHash)

  if (!fromAddress || !amountLuna || !txHash) return 'missing fields'
  if (!isValidLunaString(amountLuna)) return 'invalid amountLuna'
  if (!isValidTxHash(txHash)) return 'invalid txHash'

  return null
}

export async function handleCreatePlane(
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<CreatePlaneBody>(request)
  if (parsed instanceof Response) return parsed
  const body = parsed
  const mode = body.mode ?? 'private'

  if (mode === 'postcard') {
    return handleCreatePostcard(body, env)
  }

  if (mode !== 'private') return err('invalid mode', 400)

  const fromAddress = trimNonEmpty(body.fromAddress)
  const toAddress = trimNonEmpty(body.toAddress)
  const amountLuna = trimNonEmpty(body.amountLuna)
  const txHash = trimNonEmpty(body.txHash)
  const note = body.note?.trim()

  if (!fromAddress || !toAddress || !amountLuna || !txHash) {
    return err('missing fields', 400)
  }
  if (!note) return err('note required', 400)
  if (note.length > 500) return err('note too long', 400)
  if (!isValidLunaString(amountLuna)) return err('invalid amountLuna', 400)
  if (!isValidTxHash(txHash)) return err('invalid txHash', 400)

  const db = getDb(env)

  if (await txHashUsed(db, txHash)) return err('txHash already used', 409)

  const id = crypto.randomUUID()
  const now = Date.now()
  const launchedAt = new Date(now).toISOString()
  const arrivesAt = new Date(now + FLIGHT_MS).toISOString()
  const createdAt = launchedAt

  const fromLat = body.fromLatLng?.[0] ?? 0
  const fromLng = body.fromLatLng?.[1] ?? 0
  const toLat = body.toLatLng?.[0] ?? 0
  const toLng = body.toLatLng?.[1] ?? 0

  await db.prepare(
    `INSERT INTO planes (
      id, mode, from_address, to_address, amount_luna, note, tx_hash, status,
      launched_at, arrives_at, from_lat, from_lng, to_lat, to_lng, payout_tx_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      'private',
      normalizeAddress(fromAddress),
      normalizeAddress(toAddress),
      amountLuna,
      note,
      txHash,
      'in_flight',
      launchedAt,
      arrivesAt,
      fromLat,
      fromLng,
      toLat,
      toLng,
      null,
      createdAt,
    )
    .run()

  const row = await getPlane(db, id)
  if (!row) return err('create failed', 500)

  return json({ plane: rowToPublic(row) }, 201)
}

async function handleCreatePostcard(
  body: CreatePlaneBody,
  env: Env,
): Promise<Response> {
  if (!trimNonEmpty(env.POSTCARD_TREASURY_ADDRESS)) {
    return err('postcard treasury not configured', 503)
  }

  const fromAddress = trimNonEmpty(body.fromAddress)
  const amountLuna = trimNonEmpty(body.amountLuna)
  const txHash = trimNonEmpty(body.txHash)

  if (!fromAddress || !amountLuna || !txHash) {
    return err('missing fields', 400)
  }
  if (!isValidLunaString(amountLuna)) return err('invalid amountLuna', 400)
  if (!isValidTxHash(txHash)) return err('invalid txHash', 400)

  const db = getDb(env)

  if (await txHashUsed(db, txHash)) return err('txHash already used', 409)

  const id = crypto.randomUUID()
  const now = Date.now()
  const launchedAt = new Date(now).toISOString()
  const arrivesAt = new Date(now + POSTCARD_HOVER_MS).toISOString()
  const createdAt = launchedAt

  const fromLat = body.fromLatLng?.[0] ?? 0
  const fromLng = body.fromLatLng?.[1] ?? 0

  await db.prepare(
    `INSERT INTO planes (
      id, mode, from_address, to_address, amount_luna, note, tx_hash, status,
      launched_at, arrives_at, from_lat, from_lng, to_lat, to_lng, payout_tx_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      'postcard',
      normalizeAddress(fromAddress),
      null,
      amountLuna,
      null,
      txHash,
      'in_flight',
      launchedAt,
      arrivesAt,
      fromLat,
      fromLng,
      null,
      null,
      null,
      createdAt,
    )
    .run()

  const row = await getPlane(db, id)
  if (!row) return err('create failed', 500)

  return json({ plane: rowToPublic(row) }, 201)
}

export async function handleClaim(
  planeId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<ClaimBody>(request)
  if (parsed instanceof Response) return parsed
  const body = parsed

  const claimantAddress = trimNonEmpty(body.claimantAddress)
  const signature = trimNonEmpty(body.signature)
  const publicKey = trimNonEmpty(body.publicKey)

  if (!claimantAddress || !signature || !publicKey) {
    return err('claimantAddress, signature, and publicKey required', 400)
  }

  const claimInput: ClaimBody = {
    claimantAddress,
    signature,
    publicKey,
  }

  const db = getDb(env)
  await applyLandedTransitions(db)
  const plane = await getPlaneWithNote(db, planeId)
  if (!plane) return err('not found', 404)

  const { addressFromPublicKey, addressesMatch, verifyClaimSig } = await import(
    './nimiqVerify'
  )

  let sigOk = false
  let derivedAddr = ''

  try {
    sigOk = await verifyClaimSig(planeId, publicKey, signature)
    derivedAddr = await addressFromPublicKey(publicKey)
  } catch {
    await recordClaim(db, planeId, claimInput, 'rejected')
    return err('bad signature', 403)
  }

  if (!sigOk || !addressesMatch(derivedAddr, claimantAddress)) {
    await recordClaim(db, planeId, claimInput, 'rejected')
    return err('bad signature', 403)
  }

  if (plane.mode === 'postcard') {
    return handlePostcardCatch(db, planeId, plane, claimInput, env)
  }

  if (plane.mode !== 'private') return err('invalid plane mode', 400)

  if (!plane.to_address || !addressesMatch(claimantAddress, plane.to_address)) {
    await recordClaim(db, planeId, claimInput, 'rejected')
    return err('wrong address', 403)
  }

  if (plane.status === 'opened') {
    if (!plane.note) return err('note missing', 500)
    return json({ note: plane.note })
  }

  if (plane.status !== 'in_flight' && plane.status !== 'landed') {
    return err('plane not openable', 400)
  }

  const openResult = await db
    .prepare(
      `UPDATE planes SET status = 'opened'
       WHERE id = ? AND status IN ('in_flight', 'landed')`,
    )
    .bind(planeId)
    .run()

  if (!openResult.meta.changes) {
    const current = await getPlaneWithNote(db, planeId)
    if (current?.status === 'opened' && current.note) {
      return json({ note: current.note })
    }
    return err('plane not openable', 400)
  }

  await recordClaim(db, planeId, claimInput, 'opened')

  if (!plane.note) return err('note missing', 500)

  return json({ note: plane.note })
}

async function handlePostcardCatch(
  db: D1Database,
  planeId: string,
  plane: {
    amount_luna: string
    status: string
    from_address: string
    to_address: string | null
    payout_tx_hash: string | null
  },
  body: ClaimBody,
  env: Env,
): Promise<Response> {
  const { addressesMatch } = await import('./nimiqVerify')

  if (addressesMatch(body.claimantAddress!, plane.from_address)) {
    await recordClaim(db, planeId, body, 'rejected')
    return err('cannot catch own postcard', 403)
  }

  if (plane.status === 'caught') {
    if (
      plane.to_address &&
      plane.payout_tx_hash &&
      addressesMatch(body.claimantAddress!, plane.to_address)
    ) {
      return json({
        caught: true,
        amountLuna: plane.amount_luna,
        payoutTxHash: plane.payout_tx_hash,
      })
    }

    if (
      plane.to_address &&
      !plane.payout_tx_hash &&
      addressesMatch(body.claimantAddress!, plane.to_address) &&
      treasuryConfigured(env)
    ) {
      try {
        const payoutTxHash = await sendTreasuryPayout(
          env,
          body.claimantAddress!,
          plane.amount_luna,
        )
        await db.prepare('UPDATE planes SET payout_tx_hash = ? WHERE id = ?')
          .bind(payoutTxHash, planeId)
          .run()
        await recordClaim(db, planeId, body, 'caught')
        return json({
          caught: true,
          amountLuna: plane.amount_luna,
          payoutTxHash,
        })
      } catch (payoutErr) {
        const message = payoutErr instanceof Error ? payoutErr.message : 'payout failed'
        return err(`payout failed: ${message}`, 500)
      }
    }

    return err('already caught', 409)
  }

  if (plane.status !== 'in_flight') {
    return err('postcard not catchable', 400)
  }

  if (!treasuryConfigured(env)) {
    return err('postcard payout not configured', 503)
  }

  const catchResult = await db
    .prepare(
      `UPDATE planes SET status = 'caught', to_address = ?
       WHERE id = ? AND status = 'in_flight' AND mode = 'postcard'`,
    )
    .bind(normalizeAddress(body.claimantAddress!.trim()), planeId)
    .run()

  if (!catchResult.meta.changes) {
    await recordClaim(db, planeId, body, 'rejected')
    return err('already caught', 409)
  }

  let payoutTxHash: string
  try {
    payoutTxHash = await sendTreasuryPayout(
      env,
      body.claimantAddress!,
      plane.amount_luna,
    )
  } catch (payoutErr) {
    await db
      .prepare(
        `UPDATE planes SET status = 'in_flight', to_address = NULL
         WHERE id = ? AND status = 'caught' AND payout_tx_hash IS NULL`,
      )
      .bind(planeId)
      .run()
    await recordClaim(db, planeId, body, 'rejected')
    const message = payoutErr instanceof Error ? payoutErr.message : 'payout failed'
    return err(`payout failed: ${message}`, 500)
  }

  await db.prepare('UPDATE planes SET payout_tx_hash = ? WHERE id = ?')
    .bind(payoutTxHash, planeId)
    .run()

  await recordClaim(db, planeId, body, 'caught')

  return json({
    caught: true,
    amountLuna: plane.amount_luna,
    payoutTxHash,
  })
}

export async function handleCheer(
  planeId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<CheerRelayBody>(request)
  if (parsed instanceof Response) return parsed

  const validationError = validateCheerRelayBody(parsed)
  if (validationError) return err(validationError, 400)

  const fromAddress = trimNonEmpty(parsed.fromAddress)!
  const amountLuna = trimNonEmpty(parsed.amountLuna)!
  const txHash = trimNonEmpty(parsed.txHash)!

  const wordResult = parseCheerWord(parsed.word)
  if (wordResult === 'invalid') return err('invalid cheer word', 400)
  const cheerWord = wordResult

  const db = getDb(env)
  await applyLandedTransitions(db)
  const plane = await getPlane(db, planeId)
  if (!plane) return err('not found', 404)

  if (plane.mode !== 'private') return err('cheer only on private planes', 400)
  if (plane.status !== 'in_flight' && plane.status !== 'landed') {
    return err('plane not cheerable', 400)
  }

  if (await txHashUsed(db, txHash)) return err('txHash already used', 409)

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO cheers (id, plane_id, from_address, amount_luna, tx_hash, word, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, planeId, fromAddress, amountLuna, txHash, cheerWord, createdAt)
    .run()

  const cheer = {
    id,
    planeId,
    fromAddress,
    amountLuna,
    txHash,
    word: cheerWord,
    createdAt,
  }

  return json({ cheer }, 201)
}

export async function handleRelay(
  planeId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<CheerRelayBody>(request)
  if (parsed instanceof Response) return parsed

  const validationError = validateCheerRelayBody(parsed)
  if (validationError) return err(validationError, 400)

  const fromAddress = trimNonEmpty(parsed.fromAddress)!
  const amountLuna = trimNonEmpty(parsed.amountLuna)!
  const txHash = trimNonEmpty(parsed.txHash)!

  const db = getDb(env)
  await applyLandedTransitions(db)
  const plane = await getPlane(db, planeId)
  if (!plane) return err('not found', 404)

  if (plane.mode !== 'private') return err('relay only on private planes', 400)
  if (plane.status !== 'in_flight') return err('plane not in flight', 400)

  const timeSavedMs = relayTimeSavedMs(amountLuna)
  if (timeSavedMs <= 0) return err('relay amount too small', 400)

  if (await txHashUsed(db, txHash)) return err('txHash already used', 409)

  const newArrivesAt = shortenArrival(plane.arrives_at, timeSavedMs)
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO relays (id, plane_id, from_address, amount_luna, tx_hash, time_saved_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, planeId, fromAddress, amountLuna, txHash, timeSavedMs, createdAt)
    .run()

  await db.prepare('UPDATE planes SET arrives_at = ? WHERE id = ?')
    .bind(newArrivesAt, planeId)
    .run()

  const relay = {
    id,
    planeId,
    fromAddress,
    amountLuna,
    txHash,
    timeSavedMs,
    createdAt,
  }

  return json({ relay, newArrivesAt }, 201)
}

async function recordClaim(
  db: D1Database,
  planeId: string,
  body: ClaimBody,
  result: 'opened' | 'caught' | 'rejected',
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO claims (id, plane_id, claimant_address, signature, public_key, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      planeId,
      body.claimantAddress!,
      body.signature!,
      body.publicKey!,
      result,
      new Date().toISOString(),
    )
    .run()
}
