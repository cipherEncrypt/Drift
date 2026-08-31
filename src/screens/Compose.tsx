import { useState, type FormEvent } from 'react'
import { createPlane } from '../lib/api'
import { getFromLatLng, toLatLngFromAddress } from '../lib/geo'
import { nimToLuna } from '../lib/luna'
import { sendNim } from '../lib/nimiq'

interface Props {
  fromAddress: string
  onSent: () => void
}

export default function Compose({ fromAddress, onSent }: Props) {
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const amountLuna = nimToLuna(amount)
      const trimmedTo = toAddress.trim()
      const fromLatLng = await getFromLatLng()
      const toLatLng = toLatLngFromAddress(trimmedTo)
      const txHash = await sendNim(trimmedTo, Number(amountLuna))
      await createPlane({
        fromAddress,
        toAddress: trimmedTo,
        amountLuna,
        note: note.trim(),
        txHash,
        fromLatLng,
        toLatLng,
      })
      setToAddress('')
      setAmount('')
      setNote('')
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card card-elevated screen-card">
      <p className="eyebrow">Private mail</p>
      <h2 className="screen-title">Send a plane</h2>
      <p className="hint">NIM goes straight to them. Only they can open the note.</p>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>To address</span>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="NQ…"
            required
          />
        </label>

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
    </section>
  )
}
