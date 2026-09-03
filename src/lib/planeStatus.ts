import type { PublicPlane } from '../types/plane'
import { etaLabel } from './flightClock'

export type PlaneStatusTone = 'flight' | 'delivered' | 'opened'

export function privatePlaneStatusLabel(
  plane: PublicPlane,
  now = Date.now(),
): { label: string; tone: PlaneStatusTone } {
  if (plane.status === 'opened') {
    return { label: 'Opened', tone: 'opened' }
  }

  if (plane.status === 'landed') {
    return { label: 'Delivered', tone: 'delivered' }
  }

  const eta = etaLabel(plane.arrivesAt, now)
  if (eta === 'Landed') {
    return { label: 'Delivered', tone: 'delivered' }
  }

  return { label: 'In flight', tone: 'flight' }
}

export function privatePlaneStatusStep(plane: PublicPlane, now = Date.now()): number {
  if (plane.status === 'opened') return 2
  if (plane.status === 'landed') return 1
  if (plane.status === 'in_flight' && etaLabel(plane.arrivesAt, now) === 'Landed') {
    return 1
  }
  return 0
}

export function parseCheerWordInput(value: string): string | null | 'invalid' {
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
