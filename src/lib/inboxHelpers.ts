import { etaLabel, flightProgress } from './flightClock'
import type { InboxPlane, PlaneStatus } from '../types/plane'

export function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

export type InboxSection = 'incoming' | 'opened'

export function inboxSection(plane: InboxPlane): InboxSection {
  if (plane.status === 'opened') return 'opened'
  return 'incoming'
}

export type StatusTone = 'flight' | 'ready' | 'opened' | 'delivered'

export function inboxStatusLabel(
  plane: InboxPlane,
  now = Date.now(),
): { label: string; tone: StatusTone } {
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

  return { label: `In flight · ${eta}`, tone: 'flight' }
}

export function flightProgressPct(plane: InboxPlane, now = Date.now()): number {
  return Math.round(flightProgress(plane.launchedAt, plane.arrivesAt, now) * 100)
}

export function unreadCount(planes: InboxPlane[]): number {
  return planes.filter((p) => inboxSection(p) === 'incoming').length
}

export function hasCheers(plane: InboxPlane): boolean {
  return Number(plane.cheerTotalLuna) > 0
}

export function formatStatus(status: PlaneStatus): string {
  return status.replace(/_/g, ' ')
}
