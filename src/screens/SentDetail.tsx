import { useEffect, useState } from 'react'
import { getPlane } from '../lib/api'
import { useProfiles } from '../context/ProfileContext'
import StatusPath from '../components/StatusPath'
import UserLabel from '../components/UserLabel'
import { lunaToNim } from '../lib/luna'
import { privatePlaneStatusLabel } from '../lib/planeStatus'
import type { Cheer, PublicPlane, Relay } from '../types/plane'

interface Props {
  plane: PublicPlane
  onClose: () => void
}

export default function SentDetail({ plane: initialPlane, onClose }: Props) {
  const { loadAddresses } = useProfiles()
  const [plane, setPlane] = useState(initialPlane)
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getPlane(initialPlane.id)
      .then((data) => {
        if (cancelled) return
        setPlane(data.plane)
        setCheers(data.cheers)
        setRelays(data.relays)
        loadAddresses([
          data.plane.fromAddress,
          data.plane.toAddress,
          ...data.cheers.map((c) => c.fromAddress),
          ...data.relays.map((r) => r.fromAddress),
        ].filter(Boolean) as string[])
      })
      .catch(() => {
        if (!cancelled) setCheers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialPlane.id, loadAddresses])

  const { label, tone } = privatePlaneStatusLabel(plane)

  return (
    <section className="card card-elevated sent-detail">
      <div className="row-head">
        <div>
          <p className="eyebrow">Sent</p>
          <h2 className="screen-title">Private plane</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <StatusPath plane={plane} />

      <span className={`status-pill tone-${tone} claim-status-pill`}>{label}</span>

      <dl className="meta-grid">
        <div>
          <dt>To</dt>
          <dd>
            {plane.toAddress ? <UserLabel address={plane.toAddress} /> : '—'}
          </dd>
        </div>
        <div>
          <dt>Send</dt>
          <dd>{lunaToNim(plane.amountLuna)} NIM</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{label}</dd>
        </div>
      </dl>

      {loading && <p className="status small-hint">Loading cheers…</p>}

      {(cheers.length > 0 || relays.length > 0) && (
        <div className="stamp-list">
          <p className="label">Stamps</p>
          <ul>
            {cheers.map((cheer) => (
              <li key={cheer.id} className="cheer-stamp">
                <UserLabel address={cheer.fromAddress} />
                {cheer.word ? ` · ${cheer.word}` : ` · +${lunaToNim(cheer.amountLuna)} NIM`}
              </li>
            ))}
            {relays.map((relay) => (
              <li key={relay.id}>
                <UserLabel address={relay.fromAddress} /> relayed (
                {lunaToNim(relay.amountLuna)} NIM)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
