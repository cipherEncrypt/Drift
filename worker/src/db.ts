import type { Cheer, InboxPlane, PlaneRow, PublicPlane, Relay } from './types'

const PLANE_COLS =
  'id, mode, from_address, to_address, amount_luna, tx_hash, status, launched_at, arrives_at, from_lat, from_lng, to_lat, to_lng, payout_tx_hash, created_at'

export function rowToPublic(row: PlaneRow): PublicPlane {
  const toLatLng =
    row.to_lat != null && row.to_lng != null
      ? ([row.to_lat, row.to_lng] as [number, number])
      : null

  return {
    id: row.id,
    mode: row.mode as PublicPlane['mode'],
    fromAddress: row.from_address,
    toAddress: row.to_address,
    amountLuna: row.amount_luna,
    txHash: row.tx_hash,
    status: row.status as PublicPlane['status'],
    launchedAt: row.launched_at,
    arrivesAt: row.arrives_at,
    fromLatLng: [row.from_lat, row.from_lng],
    toLatLng,
    payoutTxHash: row.payout_tx_hash ?? null,
    createdAt: row.created_at,
  }
}

export async function getPlane(db: D1Database, id: string): Promise<PlaneRow | null> {
  return db
    .prepare(`SELECT ${PLANE_COLS} FROM planes WHERE id = ?`)
    .bind(id)
    .first<PlaneRow>()
}

export async function getPlaneByTxHash(
  db: D1Database,
  txHash: string,
): Promise<PlaneRow | null> {
  return db
    .prepare(`SELECT ${PLANE_COLS} FROM planes WHERE tx_hash = ?`)
    .bind(txHash)
    .first<PlaneRow>()
}

export async function getPlaneWithNote(db: D1Database, id: string): Promise<PlaneRow | null> {
  return db
    .prepare('SELECT * FROM planes WHERE id = ?')
    .bind(id)
    .first<PlaneRow>()
}

export async function inboxPlanes(db: D1Database, address: string): Promise<PublicPlane[]> {
  const enriched = await inboxPlanesEnriched(db, address)
  return enriched
}

export async function cheerTotalsForPlanes(
  db: D1Database,
  planeIds: string[],
): Promise<Record<string, string>> {
  if (planeIds.length === 0) return {}

  const placeholders = planeIds.map(() => '?').join(',')
  const { results } = await db
    .prepare(
      `SELECT plane_id, amount_luna FROM cheers WHERE plane_id IN (${placeholders})`,
    )
    .bind(...planeIds)
    .all()

  const totals: Record<string, number> = {}
  for (const row of (results ?? []) as { plane_id: string; amount_luna: string }[]) {
    const n = Number(row.amount_luna)
    if (!Number.isFinite(n)) continue
    totals[row.plane_id] = (totals[row.plane_id] ?? 0) + n
  }

  const out: Record<string, string> = {}
  for (const [id, sum] of Object.entries(totals)) {
    out[id] = String(sum)
  }
  return out
}

export async function inboxPlanesEnriched(
  db: D1Database,
  address: string,
): Promise<InboxPlane[]> {
  const norm = normalizeAddress(address)
  const { results } = await db
    .prepare(
      `SELECT ${PLANE_COLS} FROM planes WHERE to_address IS NOT NULL ORDER BY created_at DESC`,
    )
    .all()

  const rows = (results ?? []) as PlaneRow[]
  const filtered = rows.filter(
    (row) => row.to_address && normalizeAddress(row.to_address) === norm,
  )

  const ids = filtered.map((row) => row.id)
  const cheerTotals = await cheerTotalsForPlanes(db, ids)

  return filtered.map((row) => {
    const publicPlane = rowToPublic(row)
    const cheerTotalLuna = cheerTotals[row.id] ?? '0'
    const base = Number(publicPlane.amountLuna)
    const cheer = Number(cheerTotalLuna)
    const totalLuna = String(
      Number.isFinite(base) && Number.isFinite(cheer) ? base + cheer : base,
    )

    return {
      ...publicPlane,
      cheerTotalLuna,
      totalLuna,
    }
  })
}

export async function skyPlanes(db: D1Database, status: string): Promise<PublicPlane[]> {
  const { results } = await db
    .prepare(
      `SELECT ${PLANE_COLS} FROM planes WHERE status = ? ORDER BY arrives_at ASC`,
    )
    .bind(status)
    .all()

  return ((results ?? []) as PlaneRow[]).map(rowToPublic)
}

export function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase()
}

export async function applyLandedTransitions(db: D1Database): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE planes SET status = 'landed'
       WHERE mode = 'private' AND status = 'in_flight' AND arrives_at <= ?`,
    )
    .bind(now)
    .run()
}

export async function sentPlanes(db: D1Database, address: string): Promise<PublicPlane[]> {
  const norm = normalizeAddress(address)
  const { results } = await db
    .prepare(
      `SELECT ${PLANE_COLS} FROM planes WHERE mode = 'private' ORDER BY created_at DESC`,
    )
    .all()

  const rows = (results ?? []) as PlaneRow[]
  return rows
    .filter((row) => normalizeAddress(row.from_address) === norm)
    .map(rowToPublic)
}

export const FLIGHT_MS = 60 * 60 * 1000
export const POSTCARD_HOVER_MS = 24 * 60 * 60 * 1000

/** 0.1 NIM relay fee saves 10 minutes of flight time */
export const LUNA_PER_TEN_MIN = 10_000
export const TEN_MIN_MS = 10 * 60 * 1000
export const MIN_ARRIVAL_MS = 60 * 1000

export function relayTimeSavedMs(amountLuna: string): number {
  const luna = Number(amountLuna)
  if (!Number.isFinite(luna) || luna <= 0) return 0
  const blocks = Math.floor(luna / LUNA_PER_TEN_MIN)
  return blocks * TEN_MIN_MS
}

export async function txHashUsed(db: D1Database, txHash: string): Promise<boolean> {
  const inPlanes = await db
    .prepare('SELECT id FROM planes WHERE tx_hash = ?')
    .bind(txHash)
    .first()
  if (inPlanes) return true

  const inCheers = await db
    .prepare('SELECT id FROM cheers WHERE tx_hash = ?')
    .bind(txHash)
    .first()
  if (inCheers) return true

  const inRelays = await db
    .prepare('SELECT id FROM relays WHERE tx_hash = ?')
    .bind(txHash)
    .first()
  if (inRelays) return true

  return false
}

interface CheerRow {
  id: string
  plane_id: string
  from_address: string
  amount_luna: string
  tx_hash: string
  word: string | null
  created_at: string
}

interface RelayRow {
  id: string
  plane_id: string
  from_address: string
  amount_luna: string
  tx_hash: string
  time_saved_ms: number
  created_at: string
}

export function rowToCheer(row: CheerRow): Cheer {
  return {
    id: row.id,
    planeId: row.plane_id,
    fromAddress: row.from_address,
    amountLuna: row.amount_luna,
    txHash: row.tx_hash,
    word: row.word ?? null,
    createdAt: row.created_at,
  }
}

export function rowToRelay(row: RelayRow): Relay {
  return {
    id: row.id,
    planeId: row.plane_id,
    fromAddress: row.from_address,
    amountLuna: row.amount_luna,
    txHash: row.tx_hash,
    timeSavedMs: row.time_saved_ms,
    createdAt: row.created_at,
  }
}

export async function cheersForPlane(db: D1Database, planeId: string): Promise<Cheer[]> {
  const { results } = await db
    .prepare(
      'SELECT id, plane_id, from_address, amount_luna, tx_hash, word, created_at FROM cheers WHERE plane_id = ? ORDER BY created_at ASC',
    )
    .bind(planeId)
    .all()

  return ((results ?? []) as CheerRow[]).map(rowToCheer)
}

export async function relaysForPlane(db: D1Database, planeId: string): Promise<Relay[]> {
  const { results } = await db
    .prepare(
      'SELECT id, plane_id, from_address, amount_luna, tx_hash, time_saved_ms, created_at FROM relays WHERE plane_id = ? ORDER BY created_at ASC',
    )
    .bind(planeId)
    .all()

  return ((results ?? []) as RelayRow[]).map(rowToRelay)
}

export function shortenArrival(arrivesAt: string, timeSavedMs: number): string {
  const now = Date.now()
  const current = new Date(arrivesAt).getTime()
  const target = current - timeSavedMs
  const clamped = Math.max(now + MIN_ARRIVAL_MS, target)
  return new Date(clamped).toISOString()
}

/** Atomic relay ETA: subtract time in SQL and clamp to now + MIN_ARRIVAL_MS. */
export async function shortenArrivalInFlight(
  db: D1Database,
  planeId: string,
  timeSavedMs: number,
): Promise<{ ok: true; arrivesAt: string } | { ok: false }> {
  const subtractSec = Math.floor(timeSavedMs / 1000)
  const minArrivalSec = Math.floor(MIN_ARRIVAL_MS / 1000)
  const nowIso = new Date().toISOString()

  const result = await db
    .prepare(
      `UPDATE planes SET arrives_at = CASE
         WHEN datetime(arrives_at, printf('-%d seconds', ?)) < datetime(?, printf('+%d seconds', ?))
         THEN datetime(?, printf('+%d seconds', ?))
         ELSE datetime(arrives_at, printf('-%d seconds', ?))
       END
       WHERE id = ? AND status = 'in_flight'`,
    )
    .bind(
      subtractSec,
      nowIso,
      minArrivalSec,
      nowIso,
      minArrivalSec,
      subtractSec,
      planeId,
    )
    .run()

  if (!result.meta.changes) return { ok: false }

  const row = await getPlane(db, planeId)
  if (!row) return { ok: false }

  return { ok: true, arrivesAt: row.arrives_at }
}
