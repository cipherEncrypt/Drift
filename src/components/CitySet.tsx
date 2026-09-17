import { useState, type FormEvent } from 'react'
import { setProfileCity, type PublicProfile } from '../lib/api'
import { cityBySlug } from '../lib/cities'
import { signCity } from '../lib/nimiq'
import CitySelect from './CitySelect'

interface Props {
  address: string
  currentCity?: string | null
  onSaved: (profile: PublicProfile) => void
  onClose: () => void
}

export default function CitySet({ address, currentCity, onSaved, onClose }: Props) {
  const [city, setCity] = useState(currentCity ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const listed = cityBySlug(city)
    if (!listed) {
      setError('pick a city')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const sig = await signCity(listed.slug)
      const profile = await setProfileCity({
        address,
        city: listed.slug,
        signature: String(sig.signature).trim(),
        publicKey: String(sig.publicKey).trim(),
      })
      onSaved(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'city save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="profile-overlay" role="dialog" aria-modal="true">
      <section className="card card-elevated profile-claim">
        <p className="eyebrow">Map pin</p>
        <h2 className="screen-title">Set city</h2>
        <p className="hint">Planes fly from this city. NIM still goes to your address.</p>

        <form className="form" onSubmit={onSubmit}>
          <CitySelect value={city} onChange={setCity} />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy || !city}>
            {busy ? 'Signing…' : 'Save city'}
          </button>
        </form>

        <button type="button" className="text-btn profile-skip" onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  )
}
