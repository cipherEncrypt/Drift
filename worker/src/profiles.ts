import type { Env } from './env'
import { getDb } from './env'
import { cityBySlug, type City } from './cities'
import { normalizeAddress } from './db'
import {
  addressFromPublicKey,
  addressesMatch,
  debugNimiqVerify,
  verifyCitySig,
  verifyNameSig,
} from './nimiqVerify'
import {
  isValidUsername,
  normalizeUsername,
  parseJsonBody,
  trimNonEmpty,
} from './validate'

const PROFILE_COLS =
  'address, username, rename_used, city, city_lat, city_lng, updated_at, created_at'

interface ProfileRow {
  address: string
  username: string
  rename_used: number
  city: string | null
  city_lat: number | null
  city_lng: number | null
  updated_at: string
  created_at: string
}

export interface PublicProfile {
  username: string
  address: string
  city: string | null
  cityLat: number | null
  cityLng: number | null
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

function err(message: string, status: number): Response {
  return json({ error: message }, status)
}

function rowToPublic(row: ProfileRow): PublicProfile {
  return {
    username: row.username,
    address: row.address,
    city: row.city ?? null,
    cityLat: row.city_lat == null ? null : Number(row.city_lat),
    cityLng: row.city_lng == null ? null : Number(row.city_lng),
  }
}

function parseCitySlug(value: string | undefined): City | null | 'invalid' {
  const slug = trimNonEmpty(value)
  if (!slug) return null
  const city = cityBySlug(slug)
  if (!city) return 'invalid'
  return city
}

async function getProfileByAddress(
  db: D1Database,
  address: string,
): Promise<ProfileRow | null> {
  return db
    .prepare(
      `SELECT ${PROFILE_COLS} FROM profiles WHERE address = ?`,
    )
    .bind(normalizeAddress(address))
    .first<ProfileRow>()
}

async function getProfileByUsername(
  db: D1Database,
  username: string,
): Promise<ProfileRow | null> {
  return db
    .prepare(
      `SELECT ${PROFILE_COLS} FROM profiles WHERE username = ?`,
    )
    .bind(username)
    .first<ProfileRow>()
}

interface ProfileWriteBody {
  username?: string
  address?: string
  signature?: string
  publicKey?: string
  city?: string
}

async function verifyProfileSig(
  username: string,
  address: string,
  publicKey: string,
  signature: string,
): Promise<Response | null> {
  try {
    const sigOk = await verifyNameSig(username, publicKey, signature)
    if (!sigOk) {
      const debug = await debugNimiqVerify(
        `drift:name:${username}`,
        publicKey,
        signature,
        address,
      )
      console.log('profile claim verify failed', JSON.stringify(debug))
      return err('bad signature', 403)
    }

    const derivedAddr = await addressFromPublicKey(publicKey)
    if (!addressesMatch(derivedAddr, address)) {
      return err('signature address mismatch', 403)
    }
    return null
  } catch (err) {
    console.log(
      'profile claim verify error',
      err instanceof Error ? err.message : String(err),
    )
    return err('bad signature', 403)
  }
}

export async function handleProfileSearch(url: URL, env: Env): Promise<Response> {
  const raw = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const q = raw.replace(/[^a-z0-9_]/g, '').slice(0, 20)
  if (!q) return json({ profiles: [] })
  const { results } = await getDb(env)
    .prepare(
      `SELECT ${PROFILE_COLS} FROM profiles WHERE username LIKE ? ORDER BY username LIMIT 8`,
    )
    .bind(`${q}%`)
    .all()

  const profiles = ((results ?? []) as ProfileRow[]).map(rowToPublic)

  return json({ profiles })
}

export async function handleProfileByAddress(url: URL, env: Env): Promise<Response> {
  const address = trimNonEmpty(url.searchParams.get('address'))
  if (!address) return err('address required', 400)

  const row = await getProfileByAddress(getDb(env), address)
  if (!row) return err('not found', 404)

  return json(rowToPublic(row))
}

export async function handleProfileBatch(url: URL, env: Env): Promise<Response> {
  const raw = url.searchParams.get('addresses')?.trim() ?? ''
  if (!raw) return json({ profiles: [] })

  const requested = raw
    .split(',')
    .map((part) => trimNonEmpty(part))
    .filter((part): part is string => Boolean(part))
    .slice(0, 50)

  if (requested.length === 0) return json({ profiles: [] })

  const placeholders = requested.map(() => '?').join(',')
  const norms = requested.map((addr) => normalizeAddress(addr))

  const { results } = await getDb(env)
    .prepare(
      `SELECT ${PROFILE_COLS} FROM profiles WHERE address IN (${placeholders})`,
    )
    .bind(...norms)
    .all()

  const profiles = ((results ?? []) as ProfileRow[]).map(rowToPublic)

  return json({ profiles })
}

export async function handleGetProfile(username: string, env: Env): Promise<Response> {
  const normalized = normalizeUsername(username)
  if (!normalized) return err('invalid username', 400)

  const row = await getProfileByUsername(getDb(env), normalized)
  if (!row) return err('not found', 404)

  return json(rowToPublic(row))
}

export async function handleProfileDebugVerify(
  request: Request,
): Promise<Response> {
  const parsed = await parseJsonBody<ProfileWriteBody>(request)
  if (parsed instanceof Response) return parsed

  const username = normalizeUsername(parsed.username ?? '')
  const address = trimNonEmpty(parsed.address)
  const signature = trimNonEmpty(parsed.signature)
  const publicKey = trimNonEmpty(parsed.publicKey)

  if (!username || !address || !signature || !publicKey) {
    return err('username, address, signature, and publicKey required', 400)
  }

  const debug = await debugNimiqVerify(
    `drift:name:${username}`,
    publicKey,
    signature,
    address,
  )
  return json(debug)
}

export async function handleProfileClaim(
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<ProfileWriteBody>(request)
  if (parsed instanceof Response) return parsed

  const username = normalizeUsername(parsed.username ?? '')
  const address = trimNonEmpty(parsed.address)
  const signature = trimNonEmpty(parsed.signature)
  const publicKey = trimNonEmpty(parsed.publicKey)

  if (!username || !address || !signature || !publicKey) {
    return err('username, address, signature, and publicKey required', 400)
  }
  if (!isValidUsername(username)) return err('invalid username', 400)

  const city = parseCitySlug(parsed.city)
  if (city === 'invalid') return err('invalid city', 400)

  const sigError = await verifyProfileSig(username, address, publicKey, signature)
  if (sigError) return sigError

  const db = getDb(env)
  const existingAddress = await getProfileByAddress(db, address)
  if (existingAddress) return err('address already has a username', 409)

  const existingUsername = await getProfileByUsername(db, username)
  if (existingUsername) return err('username taken', 409)

  const now = new Date().toISOString()

  try {
    await db
      .prepare(
        `INSERT INTO profiles (
          address, username, rename_used, city, city_lat, city_lng, updated_at, created_at
        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
      )
      .bind(
        normalizeAddress(address),
        username,
        city?.slug ?? null,
        city?.lat ?? null,
        city?.lng ?? null,
        now,
        now,
      )
      .run()
  } catch {
    return err('username taken', 409)
  }

  const created = await getProfileByAddress(db, address)
  if (!created) return err('create failed', 500)
  return json(rowToPublic(created), 201)
}

export async function handleProfileCity(
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<ProfileWriteBody>(request)
  if (parsed instanceof Response) return parsed

  const address = trimNonEmpty(parsed.address)
  const signature = trimNonEmpty(parsed.signature)
  const publicKey = trimNonEmpty(parsed.publicKey)
  const city = parseCitySlug(parsed.city)

  if (!address || !signature || !publicKey) {
    return err('address, city, signature, and publicKey required', 400)
  }
  if (!city || city === 'invalid') return err('invalid city', 400)

  try {
    const sigOk = await verifyCitySig(city.slug, publicKey, signature)
    if (!sigOk) return err('bad signature', 403)
    const derivedAddr = await addressFromPublicKey(publicKey)
    if (!addressesMatch(derivedAddr, address)) {
      return err('signature address mismatch', 403)
    }
  } catch {
    return err('bad signature', 403)
  }

  const db = getDb(env)
  const existing = await getProfileByAddress(db, address)
  if (!existing) return err('no profile for address', 404)

  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE profiles SET city = ?, city_lat = ?, city_lng = ?, updated_at = ?
       WHERE address = ?`,
    )
    .bind(city.slug, city.lat, city.lng, now, existing.address)
    .run()

  const updated = await getProfileByAddress(db, address)
  if (!updated) return err('city update failed', 500)
  return json(rowToPublic(updated))
}

export async function handleProfileRename(
  request: Request,
  env: Env,
): Promise<Response> {
  const parsed = await parseJsonBody<ProfileWriteBody>(request)
  if (parsed instanceof Response) return parsed

  const username = normalizeUsername(parsed.username ?? '')
  const address = trimNonEmpty(parsed.address)
  const signature = trimNonEmpty(parsed.signature)
  const publicKey = trimNonEmpty(parsed.publicKey)

  if (!username || !address || !signature || !publicKey) {
    return err('username, address, signature, and publicKey required', 400)
  }
  if (!isValidUsername(username)) return err('invalid username', 400)

  const sigError = await verifyProfileSig(username, address, publicKey, signature)
  if (sigError) return sigError

  const db = getDb(env)
  const existing = await getProfileByAddress(db, address)
  if (!existing) return err('no profile for address', 404)
  if (existing.rename_used) return err('rename already used', 409)
  if (existing.username === username) return err('username unchanged', 400)

  const taken = await getProfileByUsername(db, username)
  if (taken && normalizeAddress(taken.address) !== normalizeAddress(address)) {
    return err('username taken', 409)
  }

  const now = new Date().toISOString()

  try {
    const renameResult = await db
      .prepare(
        `UPDATE profiles SET username = ?, rename_used = 1, updated_at = ?
         WHERE address = ? AND rename_used = 0`,
      )
      .bind(username, now, existing.address)
      .run()

    if (!renameResult.meta.changes) {
      return err('rename already used', 409)
    }
  } catch {
    return err('username taken', 409)
  }

  const updated = await getProfileByAddress(db, address)
  if (!updated || updated.username !== username) {
    return err('rename failed', 500)
  }

  return json(rowToPublic(updated))
}
