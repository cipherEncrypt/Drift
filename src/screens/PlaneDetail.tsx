import { useState } from 'react'
import { cheerPlane, relayPlane } from '../lib/api'
import { lunaToNim, nimToLuna } from '../lib/luna'
import { sendNim } from '../lib/nimiq'
import type { Cheer, PublicPlane, Relay } from '../types/plane'

interface Props {
  plane: PublicPlane
  cheers: Cheer[]
  relays: Relay[]
  eta: string
  walletAddress: string
  onClose: () => void
  onUpdated: (plane: PublicPlane, cheers: Cheer[], relays: Relay[]) => void
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function sumLuna(values: string[]): string {
  let total = 0
  for (const v of values) {
    const n = Number(v)
    if (Number.isFinite(n)) total += n
  }
  return String(total)
}

export default function PlaneDetail({
  plane,
  cheers,
  relays,
  eta,
  walletAddress,
  onClose,
  onUpdated,
}: Props) {
  const [cheerNim, setCheerNim] = useState('0.1')
  const [relayNim, setRelayNim] = useState('0.1')
  const [busy, setBusy] = useState<'cheer' | 'relay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cheerTotal = sumLuna(cheers.map((c) => c.amountLuna))
  const baseAmount = Number(plane.amountLuna)
  const cheerAmount = Number(cheerTotal)
  const displayTotal = String(baseAmount + cheerAmount)

  const canAct =
    plane.mode === 'private' &&
    plane.toAddress &&
    (plane.status === 'in_flight' || plane.status === 'landed')

  async function doCheer() {
    if (!plane.toAddress) return
    setError(null)
    setBusy('cheer')

    try {
      const amountLuna = nimToLuna(cheerNim)
      const txHash = await sendNim(plane.toAddress, Number(amountLuna))
      const { cheer } = await cheerPlane(plane.id, {
        fromAddress: walletAddress,
        amountLuna,
        txHash,
      })
      onUpdated(plane, [...cheers, cheer], relays)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'cheer failed')
    } finally {
      setBusy(null)
    }
  }

  async function doRelay() {
    if (!plane.toAddress) return
    setError(null)
    setBusy('relay')

    try {
      const amountLuna = nimToLuna(relayNim)
      const txHash = await sendNim(plane.toAddress, Number(amountLuna))
      const { relay, newArrivesAt } = await relayPlane(plane.id, {
        fromAddress: walletAddress,
        amountLuna,
        txHash,
      })
      onUpdated({ ...plane, arrivesAt: newArrivesAt }, cheers, [...relays, relay])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'relay failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card plane-detail">
      <div className="row-head">
        <h2 className="screen-title">Private plane</h2>
        <button type="button" className="link-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="hint">Sealed. Only the recipient can open the note.</p>

      <dl className="meta-list">
        <div>
          <dt>From</dt>
          <dd>{shortAddr(plane.fromAddress)}</dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>{plane.toAddress ? shortAddr(plane.toAddress) : '—'}</dd>
        </div>
        <div>
          <dt>Send</dt>
          <dd>{lunaToNim(plane.amountLuna)} NIM</dd>
        </div>
        {cheers.length > 0 && (
          <div>
            <dt>Cheers</dt>
            <dd>+{lunaToNim(cheerTotal)} NIM</dd>
          </div>
        )}
        <div>
          <dt>Total</dt>
          <dd>{lunaToNim(displayTotal)} NIM</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{plane.status}</dd>
        </div>
        <div>
          <dt>ETA</dt>
          <dd>{eta}</dd>
        </div>
      </dl>

      {canAct && (
        <div className="action-stack">
          <div className="action-row">
            <label className="field-label" htmlFor="cheer-amt">Cheer</label>
            <input
              id="cheer-amt"
              className="input input-sm"
              type="number"
              min="0.01"
              step="0.01"
              value={cheerNim}
              onChange={(e) => setCheerNim(e.target.value)}
              disabled={busy !== null}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={doCheer}
              disabled={busy !== null}
            >
              {busy === 'cheer' ? 'Sending…' : 'Add NIM'}
            </button>
          </div>
          <p className="hint small-hint">Extra NIM goes to the recipient. You cannot read the note.</p>

          {plane.status === 'in_flight' && (
            <>
              <div className="action-row">
                <label className="field-label" htmlFor="relay-amt">Relay</label>
                <input
                  id="relay-amt"
                  className="input input-sm"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={relayNim}
                  onChange={(e) => setRelayNim(e.target.value)}
                  disabled={busy !== null}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={doRelay}
                  disabled={busy !== null}
                >
                  {busy === 'relay' ? 'Sending…' : 'Speed up'}
                </button>
              </div>
              <p className="hint small-hint">0.1 NIM saves 10 minutes. Fee goes to the recipient.</p>
            </>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {(cheers.length > 0 || relays.length > 0) && (
        <div className="stamp-list">
          <p className="label">History</p>
          <ul>
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
    </section>
  )
}
