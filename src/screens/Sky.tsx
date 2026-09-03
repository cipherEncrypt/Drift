import { useEffect, useState } from 'react'
import SkyMap, { type PlaneOnMap } from '../components/Map/SkyMap'
import { getPlane } from '../lib/api'
import { useProfiles } from '../context/ProfileContext'
import { useSky } from '../hooks/useSky'
import { useNow } from '../hooks/useFlightProgress'
import {
  etaLabel,
  flightProgress,
  interpolateLatLng,
} from '../lib/flightClock'
import PlaneDetail from './PlaneDetail'
import PostcardCatch from './PostcardCatch'
import type { Cheer, PublicPlane, Relay } from '../types/plane'

interface Props {
  walletAddress: string
}

export default function Sky({ walletAddress }: Props) {
  const now = useNow()
  const { loadAddresses } = useProfiles()
  const { planes, loading, error, refresh, setPlanes } = useSky()
  const [selected, setSelected] = useState<PublicPlane | null>(null)
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const addrs = planes.flatMap((plane) =>
      [plane.fromAddress, plane.toAddress].filter(Boolean) as string[],
    )
    loadAddresses(addrs)
  }, [planes, loadAddresses])

  useEffect(() => {
    if (!selected) {
      setCheers([])
      setRelays([])
      return
    }

    let cancelled = false
    setDetailLoading(true)

    getPlane(selected.id)
      .then((data) => {
        if (cancelled) return
        setSelected(data.plane)
        setCheers(data.cheers)
        setRelays(data.relays)
      })
      .catch(() => {
        if (!cancelled) setCheers([])
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected?.id])

  const onMap: PlaneOnMap[] = []

  for (const plane of planes) {
    if (plane.mode === 'postcard') {
      onMap.push({ plane, position: plane.fromLatLng })
      continue
    }
    if (!plane.toLatLng) continue
    const progress = flightProgress(plane.launchedAt, plane.arrivesAt, now)
    const position = interpolateLatLng(plane.fromLatLng, plane.toLatLng, progress)
    onMap.push({ plane, position })
  }

  const selectedEta = selected ? etaLabel(selected.arrivesAt, now) : ''
  const showEmpty = !loading && !error && planes.length === 0

  function handleSelect(plane: PublicPlane) {
    setSelected(plane)
  }

  function handleUpdated(
    plane: PublicPlane,
    nextCheers: Cheer[],
    nextRelays: Relay[],
  ) {
    setSelected(plane)
    setCheers(nextCheers)
    setRelays(nextRelays)
    setPlanes((prev) => prev.map((p) => (p.id === plane.id ? plane : p)))
  }

  function handleCaught(plane: PublicPlane) {
    setSelected(plane)
    setPlanes((prev) => prev.map((p) => (p.id === plane.id ? plane : p)))
  }

  return (
    <section className="sky-screen">
      <div className="sky-map-stage">
        <div className="sky-map-wrap">
          <SkyMap
            planes={onMap}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />

          {showEmpty && (
            <div className="sky-empty" aria-live="polite">
              <div className="sky-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <path
                    d="M8 36L52 16L32 56L28 36L8 36Z"
                    fill="rgba(26,39,68,0.08)"
                  />
                  <path
                    d="M8 36L52 16L28 36M28 36L32 56L52 16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="sky-empty-title">Quiet sky</p>
              <p className="sky-empty-hint">Send a plane to fill the map</p>
            </div>
          )}

          <div className="sky-map-toolbar">
            {planes.length > 0 && (
              <span className="sky-badge">
                {planes.length} in flight
              </span>
            )}
            <button
              type="button"
              className="sky-refresh"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh sky"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && <p className="error sky-error">{error}</p>}
      {loading && planes.length === 0 && (
        <p className="status sky-loading">Scanning sky…</p>
      )}

      {selected && selected.mode === 'postcard' && (
        <div className="sky-detail-sheet">
          <PostcardCatch
            plane={selected}
            walletAddress={walletAddress}
            onClose={() => setSelected(null)}
            onCaught={handleCaught}
          />
        </div>
      )}

      {selected && selected.mode === 'private' && (
        <div className="sky-detail-sheet">
          <PlaneDetail
            plane={selected}
            cheers={cheers}
            relays={relays}
            eta={selectedEta}
            walletAddress={walletAddress}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
          />
          {detailLoading && (
            <p className="status small-hint sheet-loading">Loading details…</p>
          )}
        </div>
      )}
    </section>
  )
}
