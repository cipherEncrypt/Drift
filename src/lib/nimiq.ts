import { init, type ErrorResponse, type NimiqProvider } from '@nimiq/mini-app-sdk'
import { lunaToNumber } from './luna'

const INIT_TIMEOUT_MS = 10_000

function isErrorResponse<T>(result: T | ErrorResponse): result is ErrorResponse {
  return typeof result === 'object' && result !== null && 'error' in result
}

let providerPromise: Promise<NimiqProvider | null> | null = null

export function connectNimiq(): Promise<NimiqProvider | null> {
  if (!providerPromise) {
    providerPromise = init({ timeout: INIT_TIMEOUT_MS })
      .then((provider) => provider)
      .catch(() => null)
  }
  return providerPromise
}

async function provider(): Promise<NimiqProvider> {
  const nimiq = await connectNimiq()
  if (!nimiq) throw new Error('No Nimiq provider. Open Drift inside Nimiq Pay.')
  return nimiq
}

export async function listAccounts(): Promise<string[]> {
  const result = await provider().then((p) => p.listAccounts())
  if (isErrorResponse(result)) throw new Error(result.error.message)
  return result
}

export async function sendNim(recipient: string, valueLuna: string | number): Promise<string> {
  const value = typeof valueLuna === 'string' ? lunaToNumber(valueLuna) : valueLuna
  const result = await provider().then((p) =>
    p.sendBasicTransaction({ recipient, value }),
  )
  if (isErrorResponse(result)) throw new Error(result.error.message)
  return result
}

export interface ClaimSig {
  publicKey: string
  signature: string
}

export async function signClaim(planeId: string): Promise<ClaimSig> {
  const result = await provider().then((p) => p.sign(`claim:${planeId}`))
  if (isErrorResponse(result)) throw new Error(result.error.message)
  return result
}

export async function signName(username: string): Promise<ClaimSig> {
  const result = await provider().then((p) => p.sign(`drift:name:${username}`))
  if (isErrorResponse(result)) throw new Error(result.error.message)
  return result
}
