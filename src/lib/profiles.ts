import { shortAddr } from './inboxHelpers'

export function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase()
}

export function looksLikeNimiqAddress(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 10 && /^NQ/i.test(trimmed)
}

export function normalizeUsernameInput(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  const bare = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (!/^[a-z0-9_]{3,20}$/.test(bare)) return null
  return bare
}

export function formatUserLabel(
  username: string | null | undefined,
  address: string,
): string {
  if (username) return `@${username}`
  return shortAddr(address)
}
