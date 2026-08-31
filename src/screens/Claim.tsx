import { useEffect, useState } from 'react'
import { claimPlane, getPlane } from '../lib/api'
import { lunaToNim } from '../lib/luna'
import { signClaim } from '../lib/nimiq'
import type { PublicPlane } from '../types/plane'

interface Props {
  planeId: string
  address: string
  onBack: () => void
}

export default function Claim({ planeId, address, onBack }: Props) {
  const [plane, setPlane] = useState<PublicPlane | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { plane: p } = await getPlane(planeId)
        if (!cancelled) setPlane(p)
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

  async function onOpen() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'claim failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="card">
        <p className="status">Loading…</p>
      </section>
    )
  }

  if (!plane) {
    return (
      <section className="card">
        <p className="error">{error ?? 'Plane not found'}</p>
        <button type="button" className="link-btn" onClick={onBack}>Back</button>
      </section>
    )
  }

  return (
    <section className="card">
      <button type="button" className="link-btn back-btn" onClick={onBack}>
        Back
      </button>

      <h2 className="screen-title">Private plane</h2>
      <p className="hint">
        From {plane.fromAddress} · {lunaToNim(plane.amountLuna)} NIM
      </p>

      {note ? (
        <div className="note-box">
          <p className="label">Note</p>
          <p className="note-text">{note}</p>
        </div>
      ) : (
        <>
          <p className="hint">Sign to open the sealed note.</p>
          {error && <p className="error">{error}</p>}
          <button
            type="button"
            className="pay-button"
            onClick={onOpen}
            disabled={busy}
          >
            {busy ? 'Signing…' : 'Open note'}
          </button>
        </>
      )}
    </section>
  )
}
