import type { PlaneRow, PublicPlane } from './types'

const PLANE_COLS =
  'id, mode, from_address, to_address, amount_luna, tx_hash, status, launched_at, arrives_at, from_lat, from_lng, to_lat, to_lng, created_at'

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
    createdAt: row.created_at,
  }
}

export async function getPlane(db: D1Database, id: string): Promise<PlaneRow | null> {
  return db
    .prepare(`SELECT ${PLANE_COLS} FROM planes WHERE id = ?`)
    .bind(id)
    .first<PlaneRow>()
}

export async function getPlaneWithNote(db: D1Database, id: string): Promise<PlaneRow | null> {
  return db
    .prepare('SELECT * FROM planes WHERE id = ?')
    .bind(id)
    .first<PlaneRow>()
}

export async function inboxPlanes(db: D1Database, address: string): Promise<PublicPlane[]> {
  const norm = normalizeAddress(address)
  const { results } = await db
    .prepare(
      `SELECT ${PLANE_COLS} FROM planes
       WHERE UPPER(REPLACE(to_address, ' ', '')) = ?
       ORDER BY created_at DESC`,
    )
    .bind(norm)
    .all<PlaneRow>()

  return (results ?? []).map(rowToPublic)
}

export function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase()
}

export const FLIGHT_MS = 60 * 60 * 1000
