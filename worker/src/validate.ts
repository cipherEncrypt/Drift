export function isValidLunaString(value: string): boolean {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return false
  const n = Number(trimmed)
  return Number.isFinite(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER
}

export function trimNonEmpty(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isValidTxHash(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length < 8 || trimmed.length > 128) return false
  return /^[0-9a-fA-F]+$/.test(trimmed)
}

export async function parseJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T
  } catch {
    return Response.json({ error: 'invalid json body' }, { status: 400 })
  }
}

export function normalizeUsername(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) return null
  return trimmed
}

export function isValidUsername(value: string): boolean {
  return normalizeUsername(value) !== null
}

/** null = no word, string = valid word, 'invalid' = reject request */
export function parseCheerWord(value: string | undefined): string | null | 'invalid' {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/\s/.test(trimmed)) return 'invalid'

  const lower = trimmed.toLowerCase()
  if (
    lower.includes('http') ||
    lower.includes('www') ||
    lower.includes('://') ||
    lower.includes('.')
  ) {
    return 'invalid'
  }

  if (!/^[a-z]{2,12}$/.test(lower)) return 'invalid'

  return lower
}
