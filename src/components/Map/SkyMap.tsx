import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PublicPlane } from '../../types/plane'

export interface PlaneOnMap {
  plane: PublicPlane
  position: [number, number]
}

interface Props {
  planes: PlaneOnMap[]
  selectedId: string | null
  onSelect: (plane: PublicPlane) => void
}

export default function SkyMap({ planes, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([20, 0], 2)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const markers = markersRef.current
    const ids = new Set(planes.map((p) => p.plane.id))

    for (const [id, marker] of markers) {
      if (!ids.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    }

    for (const { plane, position } of planes) {
      const latLng: L.LatLngExpression = [position[0], position[1]]
      let marker = markers.get(plane.id)

      if (!marker) {
        const icon = L.divIcon({
          className: 'plane-marker-icon',
          html: `<div class="plane-dot${plane.id === selectedId ? ' selected' : ''}"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        marker = L.marker(latLng, { icon }).addTo(map)
        marker.on('click', () => onSelectRef.current(plane))
        markers.set(plane.id, marker)
      } else {
        marker.setLatLng(latLng)
        const el = marker.getElement()?.querySelector('.plane-dot')
        if (el) {
          el.classList.toggle('selected', plane.id === selectedId)
        }
      }
    }

    if (planes.length > 0) {
      const bounds = L.latLngBounds(planes.map((p) => p.position as L.LatLngTuple))
      map.fitBounds(bounds.pad(0.35), { maxZoom: 6, animate: false })
    }
  }, [planes, selectedId])

  return <div ref={containerRef} className="sky-map" />
}
