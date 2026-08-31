import type { Cheer, PublicPlane, Relay } from '../types/plane'

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
    const msg = data.error ?? `request failed (${res.status})`
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

export function getSky(status = 'in_flight'): Promise<{ planes: PublicPlane[] }> {
  return request(`/planes/sky?status=${encodeURIComponent(status)}`)
}

export function getInbox(address: string): Promise<{ planes: PublicPlane[] }> {
  const q = encodeURIComponent(address)
  return request(`/inbox?address=${q}`)
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

export function claimPlane(id: string, input: ClaimInput): Promise<{ note: string }> {
  return request(`/planes/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
