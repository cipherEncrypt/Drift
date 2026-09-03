import { appUrl } from './deeplink'

/** Plane-request deep link: opens Send with To prefilled. Not a payment QR. */
export function planeRequestUrl(toParam: string): string {
  const base = appUrl().replace(/\/$/, '')
  return `${base}#/send?to=${encodeURIComponent(toParam)}`
}

export function parseSendHash(): string | null {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw.startsWith('/send')) return null

  const queryIndex = raw.indexOf('?')
  if (queryIndex === -1) return null

  const to = new URLSearchParams(raw.slice(queryIndex + 1)).get('to')
  const trimmed = to?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

/** Clear consumed send hash so refresh does not re-apply prefill. */
export function consumeSendHash(): void {
  if (!parseSendHash()) return
  const path = window.location.pathname + window.location.search
  history.replaceState(null, '', path)
}

export function planeRequestToParam(username: string | null, address: string): string {
  return username ?? address
}
