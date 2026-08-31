import {
  FLIGHT_MS,
  getPlane,
  getPlaneWithNote,
  inboxPlanes,
  normalizeAddress,
  rowToPublic,
} from './db'
import {
  addressFromPublicKey,
  addressesMatch,
  verifyClaimSig,
} from './nimiqVerify'
import type { Env } from './types'

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

export async function handleInbox(url: URL, env: Env): Promise<Response> {
  const address = url.searchParams.get('address')
  if (!address) return err('address required', 400)

  const planes = await inboxPlanes(env.DB, address)
  return json({ planes })
}

export async function handleGetPlane(id: string, env: Env): Promise<Response> {
  const row = await getPlane(env.DB, id)
  if (!row) return err('not found', 404)

  return json({
    plane: rowToPublic(row),
    cheers: [],
    relays: [],
  })
}

export async function handleCreatePlane(
  request: Request,
  env: Env,
): Promise<Response> {
  const body = (await request.json()) as CreatePlaneBody

  if (body.mode !== 'private') return err('only private mode in phase 1', 400)
  if (!body.fromAddress || !body.toAddress || !body.amountLuna || !body.txHash) {
    return err('missing fields', 400)
  }
  if (!body.note?.trim()) return err('note required', 400)

  const existing = await env.DB.prepare('SELECT id FROM planes WHERE tx_hash = ?')
    .bind(body.txHash)
    .first()

  if (existing) return err('txHash already used', 409)

  const id = crypto.randomUUID()
  const now = Date.now()
  const launchedAt = new Date(now).toISOString()
  const arrivesAt = new Date(now + FLIGHT_MS).toISOString()
  const createdAt = launchedAt

  const fromLat = body.fromLatLng?.[0] ?? 0
  const fromLng = body.fromLatLng?.[1] ?? 0
  const toLat = body.toLatLng?.[0] ?? 0
  const toLng = body.toLatLng?.[1] ?? 0

  await env.DB.prepare(
    `INSERT INTO planes (
      id, mode, from_address, to_address, amount_luna, note, tx_hash, status,
      launched_at, arrives_at, from_lat, from_lng, to_lat, to_lng, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      'private',
      body.fromAddress,
      body.toAddress,
      body.amountLuna,
      body.note.trim(),
      body.txHash,
      'in_flight',
      launchedAt,
      arrivesAt,
      fromLat,
      fromLng,
      toLat,
      toLng,
      createdAt,
    )
    .run()

  const row = await getPlane(env.DB, id)
  if (!row) return err('create failed', 500)

  return json({ plane: rowToPublic(row) }, 201)
}

export async function handleClaim(
  planeId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const body = (await request.json()) as ClaimBody

  if (!body.claimantAddress || !body.signature || !body.publicKey) {
    return err('claimantAddress, signature, and publicKey required', 400)
  }

  const plane = await getPlaneWithNote(env.DB, planeId)
  if (!plane) return err('not found', 404)

  if (plane.mode !== 'private') return err('not a private plane', 400)

  const sigOk = verifyClaimSig(planeId, body.publicKey, body.signature)
  const derivedAddr = addressFromPublicKey(body.publicKey)

  if (!sigOk || !addressesMatch(derivedAddr, body.claimantAddress)) {
    await recordClaim(env.DB, planeId, body, 'rejected')
    return err('bad signature', 403)
  }

  if (!plane.to_address || !addressesMatch(body.claimantAddress, plane.to_address)) {
    await recordClaim(env.DB, planeId, body, 'rejected')
    return err('wrong address', 403)
  }

  if (plane.status === 'opened') {
    return json({ note: plane.note })
  }

  if (plane.status !== 'in_flight' && plane.status !== 'landed') {
    return err('plane not openable', 400)
  }

  await env.DB.prepare('UPDATE planes SET status = ? WHERE id = ?')
    .bind('opened', planeId)
    .run()

  await recordClaim(env.DB, planeId, body, 'opened')

  return json({ note: plane.note })
}

async function recordClaim(
  db: D1Database,
  planeId: string,
  body: ClaimBody,
  result: 'opened' | 'rejected',
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
