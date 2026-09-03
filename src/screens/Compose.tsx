import { useEffect, useState, type FormEvent } from 'react'
import { createPlane, getProfileByUsername, searchProfiles, type PublicProfile } from '../lib/api'
import { getFromLatLng, toLatLngFromAddress } from '../lib/geo'
import { shortAddr } from '../lib/inboxHelpers'
import { nimToLuna } from '../lib/luna'
import { sendNim } from '../lib/nimiq'
import {
  looksLikeNimiqAddress,
  normalizeUsernameInput,
} from '../lib/profiles'
import { resolveRecipientAddress } from '../lib/resolveRecipient'
import { useSent } from '../hooks/useSent'
import SentItem from '../components/SentItem'
import ThrowPostcard from '../components/ThrowPostcard'
import SentDetail from './SentDetail'
import type { PublicPlane } from '../types/plane'

interface Props {
  fromAddress: string
  initialTo?: string | null
}

export default function Compose({ fromAddress, initialTo }: Props) {
  const sentState = useSent(fromAddress)
  const [toField, setToField] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolvePreview, setResolvePreview] = useState<string | null>(null)
  const [resolvedProfile, setResolvedProfile] = useState<PublicProfile | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<PublicProfile[]>([])
  const [selectedSent, setSelectedSent] = useState<PublicPlane | null>(null)

  useEffect(() => {
    if (!initialTo) return
    const trimmed = initialTo.trim()
    if (!trimmed) return

    if (looksLikeNimiqAddress(trimmed)) {
      setToField(trimmed.replace(/\s/g, ''))
      return
    }

    const username = normalizeUsernameInput(trimmed)
    setToField(username ? `@${username}` : trimmed)
  }, [initialTo])

  useEffect(() => {
    const trimmed = toField.trim()
    if (!trimmed || looksLikeNimiqAddress(trimmed)) {
      setSuggestions([])
      return
    }

    const q = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
    if (q.length < 2 || !/^[a-z0-9_]+$/i.test(q)) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      searchProfiles(q.toLowerCase())
        .then((result) => {
          if (!cancelled) setSuggestions(result.profiles)
        })
        .catch(() => {
          if (!cancelled) setSuggestions([])
        })
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [toField])

  useEffect(() => {
    const trimmed = toField.trim()
    if (!trimmed) {
      setResolvePreview(null)
      setResolvedProfile(null)
      setResolveError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        if (looksLikeNimiqAddress(trimmed)) {
          const addr = trimmed.replace(/\s/g, '')
          if (!cancelled) {
            setResolvedProfile(null)
            setResolvePreview(shortAddr(addr))
            setResolveError(null)
          }
          return
        }

        const username = normalizeUsernameInput(trimmed)
        if (!username) {
          if (!cancelled) {
            setResolvePreview(null)
            setResolvedProfile(null)
            setResolveError('use @username or NQ address')
          }
          return
        }

        const profile = await getProfileByUsername(username)
        if (cancelled) return
        if (!profile) {
          setResolvedProfile(null)
          setResolvePreview(null)
          setResolveError('username not found')
          return
        }

        setResolvedProfile(profile)
        setResolveError(null)
        setResolvePreview(shortAddr(profile.address))
      } catch {
        if (!cancelled) {
          setResolvedProfile(null)
          setResolvePreview(null)
          setResolveError('could not resolve')
        }
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [toField])

  function afterSend() {
    sentState.refresh()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      if (resolveError) {
        setError(resolveError)
        return
      }

      const resolvedTo = await resolveRecipientAddress(toField)
      const amountLuna = nimToLuna(amount)
      const fromLatLng = await getFromLatLng()
      const toLatLng = toLatLngFromAddress(resolvedTo)
      const txHash = await sendNim(resolvedTo, amountLuna)
      await createPlane({
        fromAddress,
        toAddress: resolvedTo,
        amountLuna,
        note: note.trim(),
        txHash,
        fromLatLng,
        toLatLng,
      })
      setToField('')
      setAmount('')
      setNote('')
      setResolvePreview(null)
      afterSend()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="send-screen">
      <section className="card card-elevated screen-card">
        <p className="eyebrow">Private mail</p>
        <h2 className="screen-title">Send a plane</h2>
        <p className="hint">NIM goes straight to them. Only they can open the note.</p>

        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>To</span>
            <input
              type="text"
              value={toField}
              onChange={(e) => setToField(e.target.value)}
              placeholder="@username or NQ…"
              required
            />
          </label>

          {suggestions.length > 0 && !looksLikeNimiqAddress(toField.trim()) && (
            <ul className="username-suggestions">
              {suggestions.map((profile) => (
                <li key={profile.username}>
                  <button
                    type="button"
                    className="username-suggestion"
                    onClick={() => {
                      setToField(`@${profile.username}`)
                      setSuggestions([])
                    }}
                  >
                    @{profile.username}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {resolvedProfile && !resolveError && (
            <p className="hint small-hint recipient-preview">
              To @{resolvedProfile.username} · {shortAddr(resolvedProfile.address)}
            </p>
          )}
          {resolvePreview && !resolveError && !resolvedProfile && (
            <p className="hint small-hint recipient-preview">
              Sends to {resolvePreview}
            </p>
          )}
          {resolveError && toField.trim() && (
            <p className="error small-error">{resolveError}</p>
          )}

          <label className="field">
            <span>Amount (NIM)</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              required
            />
          </label>

          <label className="field">
            <span>Sealed note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Short message"
              rows={3}
              maxLength={500}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send plane'}
          </button>
        </form>

        <ThrowPostcard fromAddress={fromAddress} onThrown={afterSend} />
      </section>

      <section className="card card-elevated sent-panel">
        <div className="row-head">
          <div>
            <p className="eyebrow">Outgoing</p>
            <h2 className="screen-title">Sent</h2>
          </div>
          <button
            type="button"
            className="text-btn"
            onClick={sentState.refresh}
            disabled={sentState.loading}
          >
            Refresh
          </button>
        </div>

        {sentState.loading && sentState.planes.length === 0 && (
          <p className="status">Loading sent…</p>
        )}
        {sentState.error && <p className="error">{sentState.error}</p>}
        {!sentState.loading && !sentState.error && sentState.planes.length === 0 && (
          <p className="hint">No planes sent yet.</p>
        )}

        {sentState.planes.length > 0 && (
          <ul className="inbox-list sent-list">
            {sentState.planes.map((plane) => (
              <SentItem
                key={plane.id}
                plane={plane}
                onOpen={() => setSelectedSent(plane)}
              />
            ))}
          </ul>
        )}
      </section>

      {selectedSent && (
        <div className="sky-detail-sheet">
          <SentDetail
            plane={selectedSent}
            onClose={() => setSelectedSent(null)}
          />
        </div>
      )}
    </div>
  )
}
