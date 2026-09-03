import { useState, type FormEvent } from 'react'
import { claimProfile } from '../lib/api'
import { signName } from '../lib/nimiq'

interface Props {
  address: string
  onClaimed: (username: string) => void
  onSkip: () => void
}

export default function ProfileClaim({ address, onClaimed, onSkip }: Props) {
  const [username, setUsername] = useState('')
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

    try {
      const sig = await signName(normalized)
      await claimProfile({
        username: normalized,
        address,
        signature: sig.signature,
        publicKey: sig.publicKey,
      })
      onClaimed(normalized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'claim failed')
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
