import { init, type ErrorResponse, type NimiqProvider } from '@nimiq/mini-app-sdk'

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

export async function listAccounts(): Promise<string[]> {
  const provider = await connectNimiq()
  if (!provider) {
    throw new Error('No Nimiq provider. Open Drift inside Nimiq Pay.')
  }

  const result = await provider.listAccounts()
  if (isErrorResponse(result)) {
    throw new Error(result.error.message)
  }
  return result
}
