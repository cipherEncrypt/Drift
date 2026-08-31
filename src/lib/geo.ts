const FALLBACK: [number, number] = [52.52, 13.405]

export function getFromLatLng(): Promise<[number, number]> {
  if (!navigator.geolocation) return Promise.resolve(FALLBACK)

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(FALLBACK),
      { timeout: 8000, maximumAge: 120000 },
    )
  })
}

export function toLatLngFromAddress(address: string): [number, number] {
  const norm = address.replace(/\s/g, '').toUpperCase()
  let h = 0
  for (let i = 0; i < norm.length; i++) {
    h = (h * 31 + norm.charCodeAt(i)) >>> 0
  }
  const lat = 10 + (h % 5000) / 100
  const lng = -60 + ((h >>> 8) % 10000) / 100
  return [lat, lng]
}
