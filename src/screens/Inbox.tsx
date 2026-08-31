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
    <section className="card card-elevated screen-card">
      <div className="row-head">
        <div>
          <p className="eyebrow">For you</p>
          <h2 className="screen-title">Inbox</h2>
        </div>
        <button type="button" className="text-btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && (
        <div className="loader-row">
          <span className="loader" aria-hidden="true" />
          <p className="status">Loading…</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {!loading && !error && planes.length === 0 && (
        <div className="empty-block">
          <p className="empty-title">No planes yet</p>
          <p className="hint">When someone sends you NIM, it lands here.</p>
        </div>
      )}

      <ul className="plane-list">
        {planes.map((plane) => (
          <li key={plane.id}>
            <button
              type="button"
              className="plane-item"
              onClick={() => onOpen(plane.id)}
            >
              <span className="plane-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12L20 4L12 20L10 12L4 12Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="plane-item-body">
                <span className="plane-from">{plane.fromAddress}</span>
                <span className="plane-meta">
                  {lunaToNim(plane.amountLuna)} NIM · {plane.status}
                </span>
              </span>
              <span className="plane-item-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
