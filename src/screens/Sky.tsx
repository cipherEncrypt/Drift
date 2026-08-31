import { useEffect, useState } from 'react'
import SkyMap, { type PlaneOnMap } from '../components/Map/SkyMap'
import { getPlane } from '../lib/api'
import { useSky } from '../hooks/useSky'
import { useNow } from '../hooks/useFlightProgress'
import {
  etaLabel,
  flightProgress,
  interpolateLatLng,
} from '../lib/flightClock'
import PlaneDetail from './PlaneDetail'
import type { Cheer, PublicPlane, Relay } from '../types/plane'

interface Props {
  walletAddress: string
}

export default function Sky({ walletAddress }: Props) {
  const now = useNow()
  const { planes, loading, error, refresh, setPlanes } = useSky()
  const [selected, setSelected] = useState<PublicPlane | null>(null)
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

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
    if (!plane.toLatLng) continue
    const progress = flightProgress(plane.launchedAt, plane.arrivesAt, now)
    const position = interpolateLatLng(plane.fromLatLng, plane.toLatLng, progress)
    onMap.push({ plane, position })
  }

  const selectedEta = selected ? etaLabel(selected.arrivesAt, now) : ''

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

  return (
    <section className="sky-screen">
      <div className="row-head">
        <h2 className="screen-title">Sky</h2>
        <button type="button" className="link-btn" onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p className="status">Loading sky…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && planes.length === 0 && (
        <p className="status">No planes in flight. Send one to fill the sky.</p>
      )}

      <div className="sky-map-wrap">
        <SkyMap
          planes={onMap}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
      </div>

      {selected && (
        <PlaneDetail
          plane={selected}
          cheers={cheers}
          relays={relays}
          eta={selectedEta}
          walletAddress={walletAddress}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      {detailLoading && selected && (
        <p className="status small-hint">Loading details…</p>
      )}
    </section>
  )
}
