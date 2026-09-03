const LUNA_PER_NIM = 100_000

export function nimToLuna(nim: string): string {
  const trimmed = nim.trim()
  if (!trimmed) throw new Error('amount required')

  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('invalid amount')
  }

  const luna = Math.round(value * LUNA_PER_NIM)
  if (luna <= 0) throw new Error('amount too small')

  return String(luna)
}

export function lunaToNim(luna: string): string {
  const n = Number(luna)
  if (!Number.isFinite(n)) return '0'
  return (n / LUNA_PER_NIM).toFixed(5).replace(/\.?0+$/, '')
}

/** Safe parse for sendBasicTransaction (luna integer). */
export function lunaToNumber(luna: string): number {
  const trimmed = luna.trim()
  if (!/^\d+$/.test(trimmed)) throw new Error('invalid amount')
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) throw new Error('invalid amount')
  return n
}
