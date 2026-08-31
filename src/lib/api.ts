import type { PublicPlane } from '../types/plane'

const API_BASE = import.meta.env.DRIFT_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `request failed (${res.status})`
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
      fromLatLng: [0, 0],
      toLatLng: [0, 0],
    }),
  })
}

export function getInbox(address: string): Promise<{ planes: PublicPlane[] }> {
  const q = encodeURIComponent(address)
  return request(`/inbox?address=${q}`)
}

export function getPlane(id: string): Promise<{ plane: PublicPlane }> {
  return request(`/planes/${id}`)
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
