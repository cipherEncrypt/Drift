import { useState, type FormEvent } from 'react'
import { claimProfile, debugProfileClaim } from '../lib/api'
import { signName } from '../lib/nimiq'
import CitySelect from './CitySelect'

interface Props {
  address: string
  onClaimed: (username: string, city: string | null) => void
  onSkip: () => void
}

export default function ProfileClaim({ address, onClaimed, onSkip }: Props) {
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setError('3-20 chars: a-z, 0-9, underscore')
      return
    }

    setBusy(true)
    setError(null)

    const payload = {
      username: normalized,
      address,
      signature: '',
      publicKey: '',
      city: city || undefined,
    }

    try {
      const sig = await signName(normalized)
      payload.signature = String(sig.signature).trim()
      payload.publicKey = String(sig.publicKey).trim()
      const profile = await claimProfile(payload)
      onClaimed(profile.username, profile.city)
    } catch (err) {
      const base = err instanceof Error ? err.message : 'claim failed'
      if (base === 'bad signature' && payload.signature && payload.publicKey) {
        try {
          const debug = await debugProfileClaim(payload)
          setError(
            `${base} (sig ${debug.sigLen}b, pub ${debug.pubLen}b, verify ${String(debug.verifyOk)}, addr ${String(debug.addressMatch)})`,
          )
          return
        } catch {
          // fall through
        }
      }
      setError(base)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="profile-overlay" role="dialog" aria-modal="true">
      <section className="card card-elevated profile-claim">
        <p className="eyebrow">Your name</p>
        <h2 className="screen-title">Pick a username</h2>
        <p className="hint">
          Public label for your wallet. Others can send planes to @you.
        </p>

        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="pilot_42"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </label>

          <CitySelect value={city} onChange={setCity} optional />

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing…' : 'Claim username'}
          </button>
        </form>

        <button type="button" className="text-btn profile-skip" onClick={onSkip}>
          Skip for now
        </button>
      </section>
    </div>
  )
}
