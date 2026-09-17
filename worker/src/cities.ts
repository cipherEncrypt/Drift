export interface City {
  slug: string
  name: string
  lat: number
  lng: number
}

/** Fallback pin when a profile has no city. Lagos. */
export const DEFAULT_CITY_SLUG = 'lagos'

export const CITIES: City[] = [
  { slug: 'lagos', name: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { slug: 'accra', name: 'Accra', lat: 5.6037, lng: -0.187 },
  { slug: 'nairobi', name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { slug: 'johannesburg', name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { slug: 'cairo', name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { slug: 'cape-town', name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
  { slug: 'addis-ababa', name: 'Addis Ababa', lat: 9.032, lng: 38.7469 },
  { slug: 'dakar', name: 'Dakar', lat: 14.7167, lng: -17.4677 },
  { slug: 'kampala', name: 'Kampala', lat: 0.3476, lng: 32.5825 },
  { slug: 'casablanca', name: 'Casablanca', lat: 33.5731, lng: -7.5898 },
  { slug: 'london', name: 'London', lat: 51.5074, lng: -0.1278 },
  { slug: 'berlin', name: 'Berlin', lat: 52.52, lng: 13.405 },
  { slug: 'paris', name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { slug: 'amsterdam', name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { slug: 'lisbon', name: 'Lisbon', lat: 38.7223, lng: -9.1393 },
  { slug: 'madrid', name: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { slug: 'rome', name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { slug: 'nyc', name: 'NYC', lat: 40.7128, lng: -74.006 },
  { slug: 'mexico-city', name: 'Mexico City', lat: 19.4326, lng: -99.1332 },
  { slug: 'sao-paulo', name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  { slug: 'buenos-aires', name: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { slug: 'toronto', name: 'Toronto', lat: 43.6532, lng: -79.3832 },
  { slug: 'mumbai', name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { slug: 'singapore', name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { slug: 'tokyo', name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { slug: 'seoul', name: 'Seoul', lat: 37.5665, lng: 126.978 },
  { slug: 'dubai', name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { slug: 'manila', name: 'Manila', lat: 14.5995, lng: 120.9842 },
  { slug: 'jakarta', name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { slug: 'bangkok', name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { slug: 'sydney', name: 'Sydney', lat: -33.8688, lng: 151.2093 },
]

const bySlug = new Map(CITIES.map((city) => [city.slug, city]))

export function cityBySlug(slug: string | null | undefined): City | null {
  if (!slug) return null
  return bySlug.get(slug.trim().toLowerCase()) ?? null
}

export function defaultLatLng(): [number, number] {
  const city = cityBySlug(DEFAULT_CITY_SLUG) ?? CITIES[0]
  return [city.lat, city.lng]
}
