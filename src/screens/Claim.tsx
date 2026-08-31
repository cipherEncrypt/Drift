import { useEffect, useState } from 'react'
import { claimPlane, getPlane } from '../lib/api'
import { etaLabel, flightProgress } from '../lib/flightClock'
import {
  hasCheers,
  inboxStatusLabel,
  shortAddr,
} from '../lib/inboxHelpers'
import { lunaToNim } from '../lib/luna'
import { signClaim } from '../lib/nimiq'
import { useNow } from '../hooks/useFlightProgress'
import type { Cheer, InboxPlane, Relay } from '../types/plane'

interface Props {
  planeId: string
  address: string
  onBack: () => void
}

function sumCheerLuna(cheers: Cheer[]): string {
  let total = 0
  for (const c of cheers) {
    const n = Number(c.amountLuna)
    if (Number.isFinite(n)) total += n
  }
  return String(total)
}

export default function Claim({ planeId, address, onBack }: Props) {
  const now = useNow()
  const [plane, setPlane] = useState<InboxPlane | null>(null)
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getPlane(planeId)
        if (cancelled) return

        const cheerTotalLuna = sumCheerLuna(data.cheers)
        const base = Number(data.plane.amountLuna)
        const cheer = Number(cheerTotalLuna)
        const totalLuna = String(
          Number.isFinite(base) && Number.isFinite(cheer) ? base + cheer : base,
        )

        setPlane({
          ...data.plane,
          cheerTotalLuna,
          totalLuna,
        })
        setCheers(data.cheers)
        setRelays(data.relays)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'load failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [planeId])

  async function onOpenNote() {
    setBusy(true)
    setError(null)

    try {
      const sig = await signClaim(planeId)
      const { note: text } = await claimPlane(planeId, {
        claimantAddress: address,
        signature: sig.signature,
        publicKey: sig.publicKey,
      })
      setNote(text)
      if (plane) {
        setPlane({ ...plane, status: 'opened' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'claim failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="card card-elevated screen-card claim-screen">
        <div className="loader-row">
          <span className="loader" aria-hidden="true" />
          <p className="status">Loading plane…</p>
        </div>
      </section>
    )
  }

  if (!plane) {
    return (
      <section className="card card-elevated screen-card claim-screen">
        <p className="error">{error ?? 'Plane not found'}</p>
        <button type="button" className="text-btn" onClick={onBack}>← Back</button>
      </section>
    )
  }

  const { label, tone } = inboxStatusLabel(plane, now)
  const progress = flightProgress(plane.launchedAt, plane.arrivesAt, now)
  const progressPct = Math.round(progress * 100)
  const showFlight = plane.status !== 'opened'
  const isOpened = plane.status === 'opened' || note !== null

  return (
    <section className="claim-screen">
      <button type="button" className="text-btn claim-back" onClick={onBack}>
        ← Inbox
      </button>

      <div className="card card-elevated claim-hero">
        <div className="claim-hero-top">
          <span className="claim-plane-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12L20 4L12 20L10 12L4 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="eyebrow">Private plane</p>
            <h2 className="screen-title">From {shortAddr(plane.fromAddress)}</h2>
          </div>
        </div>

        <span className={`status-pill tone-${tone} claim-status-pill`}>{label}</span>

        {showFlight && (
          <div className="claim-flight">
            <div className="claim-flight-head">
              <span className="label">Flight</span>
              <span className="claim-eta">{etaLabel(plane.arrivesAt, now)}</span>
            </div>
            <div className="claim-progress-track">
              <span
                className="claim-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="hint small-hint">
              {progressPct >= 100
                ? 'Plane has landed. You can open the note.'
                : 'NIM is already in your wallet while the plane flies.'}
            </p>
          </div>
        )}

        <dl className="meta-grid claim-meta">
          <div>
            <dt>Send</dt>
            <dd>{lunaToNim(plane.amountLuna)} NIM</dd>
          </div>
          {hasCheers(plane) && (
            <div>
              <dt>Cheers</dt>
              <dd>+{lunaToNim(plane.cheerTotalLuna)} NIM</dd>
            </div>
          )}
          <div>
            <dt>Total</dt>
            <dd className="claim-total">{lunaToNim(plane.totalLuna)} NIM</dd>
          </div>
          <div>
            <dt>From</dt>
            <dd>{shortAddr(plane.fromAddress)}</dd>
          </div>
        </dl>
      </div>

      {(cheers.length > 0 || relays.length > 0) && (
        <div className="card card-elevated claim-stamps">
          <p className="label">Along the way</p>
          <ul className="stamp-lines">
            {cheers.map((c) => (
              <li key={c.id}>
                {shortAddr(c.fromAddress)} added {lunaToNim(c.amountLuna)} NIM
              </li>
            ))}
            {relays.map((r) => (
              <li key={r.id}>
                {shortAddr(r.fromAddress)} relayed ({lunaToNim(r.amountLuna)} NIM)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card card-elevated claim-note-card">
        {note ? (
          <>
            <p className="eyebrow">Sealed note</p>
            <div className="note-box note-box-reveal">
              <p className="note-text">{note}</p>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Sealed note</p>
            <p className="hint">
              {isOpened
                ? 'Sign again to view the note.'
                : 'Only your wallet can unlock this message.'}
            </p>
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="btn-primary"
              onClick={onOpenNote}
              disabled={busy}
            >
              {busy
                ? 'Signing…'
                : isOpened
                  ? 'View note again'
                  : 'Open sealed note'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
