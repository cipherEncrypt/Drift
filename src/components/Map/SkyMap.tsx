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

function markerHtml(mode: PublicPlane['mode'], selected: boolean): string {
  if (mode === 'postcard') {
    return `<div class="postcard-marker${selected ? ' selected' : ''}" aria-hidden="true">
      <span class="postcard-marker-ring"></span>
      <span class="postcard-marker-body">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.75"/>
          <path d="M4 9l8 5 8-5" stroke="currentColor" stroke-width="1.75"/>
        </svg>
      </span>
    </div>`
  }

  return `<div class="plane-marker${selected ? ' selected' : ''}" aria-hidden="true">
    <span class="plane-marker-ring"></span>
    <span class="plane-marker-body">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 12L21 4L12 20L10 12L3 12Z" fill="currentColor"/>
      </svg>
    </span>
  </div>`
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

    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
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
      const isSelected = plane.id === selectedId
      let marker = markers.get(plane.id)

      if (!marker) {
        const icon = L.divIcon({
          className: 'plane-marker-icon',
          html: markerHtml(plane.mode, isSelected),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
        marker = L.marker(latLng, { icon }).addTo(map)
        marker.on('click', () => onSelectRef.current(plane))
        markers.set(plane.id, marker)
      } else {
        marker.setLatLng(latLng)
        const root = marker.getElement()?.querySelector('.plane-marker, .postcard-marker')
        if (root) {
          root.classList.toggle('selected', isSelected)
        }
      }
    }

    if (planes.length > 0) {
      const bounds = L.latLngBounds(planes.map((p) => p.position as L.LatLngTuple))
      map.fitBounds(bounds.pad(0.4), { maxZoom: 6, animate: true })
    }
  }, [planes, selectedId])

  return <div ref={containerRef} className="sky-map" />
}
