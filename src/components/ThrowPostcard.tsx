import { useEffect, useState, type FormEvent } from 'react'
import { createPostcard, getConfig } from '../lib/api'
import { getFromLatLng } from '../lib/geo'
import { nimToLuna } from '../lib/luna'
import { sendNim } from '../lib/nimiq'

interface Props {
  fromAddress: string
  onThrown: () => void
}

export default function ThrowPostcard({ fromAddress, onThrown }: Props) {
  const [amount, setAmount] = useState('')
  const [treasury, setTreasury] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setTreasury(cfg.postcardTreasuryAddress)
        setEnabled(cfg.postcardThrowEnabled)
      })
      .catch(() => setEnabled(false))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!treasury) return

    setError(null)
    setBusy(true)

    try {
      const amountLuna = nimToLuna(amount)
      const fromLatLng = await getFromLatLng()
      const txHash = await sendNim(treasury, amountLuna)
      await createPostcard({
        fromAddress,
        amountLuna,
        txHash,
        fromLatLng,
      })
      setAmount('')
      setOpen(false)
      onThrown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'postcard failed')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) return null

  return (
    <div className="postcard-throw">
      {!open ? (
        <button
          type="button"
          className="btn-postcard"
          onClick={() => setOpen(true)}
        >
          Throw a postcard
        </button>
      ) : (
        <form className="postcard-form card card-elevated" onSubmit={onSubmit}>
          <p className="eyebrow eyebrow-postcard">Public game</p>
          <h3 className="postcard-title">Postcard</h3>
          <p className="postcard-warning">
            Anyone can catch this. No note, no takebacks. NIM goes to the treasury until caught.
          </p>

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

          {error && <p className="error">{error}</p>}

          <div className="postcard-actions">
            <button type="button" className="text-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-postcard-solid" disabled={busy}>
              {busy ? 'Throwing…' : 'Throw postcard'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
