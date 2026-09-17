import { useEffect, useState, type FormEvent } from 'react'
import { getConfig, savePostcardWithRetry, tryGetProfileByAddress, type CreatePostcardInput } from '../lib/api'
import { pinFromProfile } from '../lib/cities'
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
  const [pendingSave, setPendingSave] = useState<{
    txHash: string
    payload: CreatePostcardInput
  } | null>(null)

  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setTreasury(cfg.postcardTreasuryAddress)
        setEnabled(cfg.postcardThrowEnabled)
      })
      .catch(() => setEnabled(false))
  }, [])

  async function retrySave() {
    if (!pendingSave) return
    setError(null)
    setBusy(true)

    try {
      await savePostcardWithRetry(pendingSave.payload)
      setPendingSave(null)
      setAmount('')
      setOpen(false)
      onThrown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!treasury) return

    setError(null)
    setPendingSave(null)
    setBusy(true)

    try {
      const amountLuna = nimToLuna(amount)
      const sender = await tryGetProfileByAddress(fromAddress).catch(() => null)
      const fromLatLng = pinFromProfile(sender)
      const txHash = await sendNim(treasury, amountLuna)
      const payload: CreatePostcardInput = {
        fromAddress,
        amountLuna,
        txHash,
        fromLatLng,
      }

      try {
        await savePostcardWithRetry(payload)
        setAmount('')
        setOpen(false)
        onThrown()
      } catch {
        setPendingSave({ txHash, payload })
      }
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

          {pendingSave && (
            <div className="pending-save">
              <p className="pending-save-title">Payment sent — postcard not saved yet</p>
              <p className="hint small-hint">
                Your NIM went to the treasury. Save the throw to the sky.
              </p>
              <p className="pending-save-tx">{pendingSave.txHash}</p>
              <button
                type="button"
                className="btn-postcard-solid"
                onClick={retrySave}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Retry save'}
              </button>
            </div>
          )}

          <div className="postcard-actions">
            <button type="button" className="text-btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-postcard-solid" disabled={busy || Boolean(pendingSave)}>
              {busy ? 'Throwing…' : 'Throw postcard'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
