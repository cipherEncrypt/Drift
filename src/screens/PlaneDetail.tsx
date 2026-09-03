import { useEffect, useState } from 'react'
import { cheerPlane, relayPlane } from '../lib/api'
import { useProfiles } from '../context/ProfileContext'
import StatusPath from '../components/StatusPath'
import UserLabel from '../components/UserLabel'
import { lunaToNim, nimToLuna } from '../lib/luna'
import { sendNim } from '../lib/nimiq'
import {
  parseCheerWordInput,
  privatePlaneStatusLabel,
} from '../lib/planeStatus'
import { normalizeAddress } from '../lib/profiles'
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
  const { loadAddresses } = useProfiles()
  const [cheerNim, setCheerNim] = useState('0.1')
  const [cheerWord, setCheerWord] = useState('')
  const [relayNim, setRelayNim] = useState('0.1')
  const [busy, setBusy] = useState<'cheer' | 'relay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cheerTotal = sumLuna(cheers.map((c) => c.amountLuna))
  const baseAmount = Number(plane.amountLuna)
  const cheerAmount = Number(cheerTotal)
  const displayTotal = String(baseAmount + cheerAmount)
  const isSender =
    normalizeAddress(walletAddress) === normalizeAddress(plane.fromAddress)
  const { label: statusLabel, tone } = privatePlaneStatusLabel(plane)

  const canAct =
    plane.mode === 'private' &&
    plane.toAddress &&
    !isSender &&
    (plane.status === 'in_flight' || plane.status === 'landed')

  useEffect(() => {
    const addrs = [
      plane.fromAddress,
      plane.toAddress,
      ...cheers.map((c) => c.fromAddress),
      ...relays.map((r) => r.fromAddress),
    ].filter((addr): addr is string => Boolean(addr))
    loadAddresses(addrs)
  }, [plane, cheers, relays, loadAddresses])

  async function doCheer() {
    if (!plane.toAddress) return
    setError(null)

    const wordResult = parseCheerWordInput(cheerWord)
    if (cheerWord.trim() && wordResult === 'invalid') {
      setError('cheer word must be one word, 2-12 letters')
      return
    }

    setBusy('cheer')

    try {
      const amountLuna = nimToLuna(cheerNim)
      const txHash = await sendNim(plane.toAddress, amountLuna)
      const { cheer } = await cheerPlane(plane.id, {
        fromAddress: walletAddress,
        amountLuna,
        txHash,
        word: wordResult ?? undefined,
      })
      setCheerWord('')
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
      const txHash = await sendNim(plane.toAddress, amountLuna)
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
    <section className="card card-elevated plane-detail">
      <div className="row-head">
        <div>
          <p className="eyebrow">{isSender ? 'Sent' : 'In flight'}</p>
          <h2 className="screen-title">Private plane</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>

      {isSender ? (
        <StatusPath plane={plane} />
      ) : (
        <p className="hint sealed-hint">Sealed. Only the recipient can open the note.</p>
      )}

      <dl className="meta-grid">
        <div>
          <dt>From</dt>
          <dd><UserLabel address={plane.fromAddress} /></dd>
        </div>
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
          <dd>
            <span className={`status-pill tone-${tone}`}>{statusLabel}</span>
          </dd>
        </div>
        {!isSender && plane.status === 'in_flight' && (
          <div>
            <dt>ETA</dt>
            <dd className="eta-value">{eta}</dd>
          </div>
        )}
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
          <div className="action-row cheer-word-row">
            <label className="field-label" htmlFor="cheer-word">Word</label>
            <input
              id="cheer-word"
              className="input input-sm"
              type="text"
              value={cheerWord}
              onChange={(e) => setCheerWord(e.target.value)}
              placeholder="optional"
              maxLength={12}
              disabled={busy !== null}
            />
          </div>
          <p className="hint small-hint">
            Extra NIM goes to the recipient. Optional one-word stamp.
          </p>

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
          <p className="label">Stamps</p>
          <ul>
            {cheers.map((c) => (
              <li key={c.id} className="cheer-stamp">
                <UserLabel address={c.fromAddress} />
                {c.word ? ` · ${c.word}` : ` · +${lunaToNim(c.amountLuna)} NIM`}
              </li>
            ))}
            {relays.map((r) => (
              <li key={r.id}>
                <UserLabel address={r.fromAddress} /> relayed (
                {lunaToNim(r.amountLuna)} NIM)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
