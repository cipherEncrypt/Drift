import type { Cheer, InboxPlane, PublicPlane, Relay } from '../types/plane'

const API_BASE = import.meta.env.DRIFT_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  } catch {
    throw new Error('cannot reach API. Is the worker deployed?')
  }

  const text = await res.text()
  let data: { error?: string } = {}

  if (text) {
    try {
      data = JSON.parse(text) as { error?: string }
    } catch {
      throw new Error(`API returned invalid response (${res.status})`)
    }
  }

  if (!res.ok) {
    const fallback =
      res.status === 403
        ? 'not allowed'
        : res.status === 409
          ? 'already done'
          : res.status === 503
            ? 'service unavailable'
            : `request failed (${res.status})`
    const msg = data.error ?? fallback
    throw new Error(msg)
  }

  return data as T
}

export interface CreatePlaneInput {
  fromAddress: string
  toAddress: string
  amountLuna: string
  note: string
  txHash: string
  fromLatLng: [number, number]
  toLatLng: [number, number]
}

export function createPlane(input: CreatePlaneInput): Promise<{ plane: PublicPlane }> {
  return request('/planes', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'private',
      fromAddress: input.fromAddress,
      toAddress: input.toAddress,
      amountLuna: input.amountLuna,
      note: input.note,
      txHash: input.txHash,
      fromLatLng: input.fromLatLng,
      toLatLng: input.toLatLng,
    }),
  })
}

export interface CreatePostcardInput {
  fromAddress: string
  amountLuna: string
  txHash: string
  fromLatLng: [number, number]
}

export function createPostcard(input: CreatePostcardInput): Promise<{ plane: PublicPlane }> {
  return request('/planes', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'postcard',
      fromAddress: input.fromAddress,
      amountLuna: input.amountLuna,
      txHash: input.txHash,
      fromLatLng: input.fromLatLng,
    }),
  })
}

export interface DriftConfig {
  postcardTreasuryAddress: string | null
  postcardThrowEnabled: boolean
  postcardCatchEnabled: boolean
}

export function getConfig(): Promise<DriftConfig> {
  return request('/config')
}

export function getSky(status = 'in_flight'): Promise<{ planes: PublicPlane[] }> {
  return request(`/planes/sky?status=${encodeURIComponent(status)}`)
}

export function getInbox(address: string): Promise<{ planes: InboxPlane[] }> {
  const q = encodeURIComponent(address)
  return request(`/inbox?address=${q}`)
}

export function getSent(address: string): Promise<{ planes: PublicPlane[] }> {
  const q = encodeURIComponent(address)
  return request(`/sent?address=${q}`)
}

export function getPlane(id: string): Promise<{
  plane: PublicPlane
  cheers: Cheer[]
  relays: Relay[]
}> {
  return request(`/planes/${id}`)
}

export interface CheerRelayInput {
  fromAddress: string
  amountLuna: string
  txHash: string
  word?: string
}

export function cheerPlane(
  id: string,
  input: CheerRelayInput,
): Promise<{ cheer: Cheer }> {
  return request(`/planes/${id}/cheer`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function relayPlane(
  id: string,
  input: CheerRelayInput,
): Promise<{ relay: Relay; newArrivesAt: string }> {
  return request(`/planes/${id}/relay`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface ClaimInput {
  claimantAddress: string
  signature: string
  publicKey: string
}

export function claimPlane(
  id: string,
  input: ClaimInput,
): Promise<{ note: string } | { caught: true; amountLuna: string; payoutTxHash: string }> {
  return request(`/planes/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface PublicProfile {
  username: string
  address: string
}

export function searchProfiles(q: string): Promise<{ profiles: PublicProfile[] }> {
  const query = encodeURIComponent(q.trim().toLowerCase())
  return request(`/profiles/search?q=${query}`)
}

export function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const name = encodeURIComponent(username.trim().toLowerCase())
  return request<PublicProfile>(`/profiles/${name}`).catch((e) => {
    if (e instanceof Error && e.message === 'not found') return null
    throw e
  })
}

export function getProfileByAddress(address: string): Promise<PublicProfile> {
  const q = encodeURIComponent(address.trim())
  return request(`/profiles/by-address?address=${q}`)
}

export function tryGetProfileByAddress(address: string): Promise<PublicProfile | null> {
  const q = encodeURIComponent(address.trim())
  return request<PublicProfile>(`/profiles/by-address?address=${q}`).catch((e) => {
    if (e instanceof Error && e.message === 'not found') return null
    throw e
  })
}

export function getProfileBatch(addresses: string[]): Promise<{ profiles: PublicProfile[] }> {
  const q = encodeURIComponent(addresses.join(','))
  return request(`/profiles/batch?addresses=${q}`)
}

export interface ProfileWriteInput {
  username: string
  address: string
  signature: string
  publicKey: string
}

export function claimProfile(input: ProfileWriteInput): Promise<PublicProfile> {
  return request('/profiles/claim', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function renameProfile(input: ProfileWriteInput): Promise<PublicProfile> {
  return request('/profiles/rename', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
