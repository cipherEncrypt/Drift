export function flightProgress(
  launchedAt: string,
  arrivesAt: string,
  now = Date.now(),
): number {
  const start = Date.parse(launchedAt)
  const end = Date.parse(arrivesAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1
  const t = (now - start) / (end - start)
  return Math.min(1, Math.max(0, t))
}

export function interpolateLatLng(
  from: [number, number],
  to: [number, number],
  progress: number,
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ]
}

export function etaLabel(arrivesAt: string, now = Date.now()): string {
  const ms = Date.parse(arrivesAt) - now
  if (ms <= 0) return 'Landed'
  const min = Math.ceil(ms / 60000)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
