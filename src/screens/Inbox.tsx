import { useCallback, useEffect, useState } from 'react'
import { getInbox } from '../lib/api'
import { lunaToNim } from '../lib/luna'
import type { PublicPlane } from '../types/plane'

interface Props {
  address: string
  onOpen: (planeId: string) => void
}

export default function Inbox({ address, onOpen }: Props) {
  const [planes, setPlanes] = useState<PublicPlane[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { planes: list } = await getInbox(address)
      setPlanes(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed')
      setPlanes([])
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="card">
      <div className="row-head">
        <h2 className="screen-title">Inbox</h2>
        <button type="button" className="link-btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p className="status">Loading…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && planes.length === 0 && (
        <p className="status">No planes yet.</p>
      )}

      <ul className="plane-list">
        {planes.map((plane) => (
          <li key={plane.id}>
            <button
              type="button"
              className="plane-item"
              onClick={() => onOpen(plane.id)}
            >
              <span className="plane-from">{plane.fromAddress}</span>
              <span className="plane-meta">
                {lunaToNim(plane.amountLuna)} NIM · {plane.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
