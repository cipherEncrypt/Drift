import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { planeRequestToParam, planeRequestUrl } from '../lib/planeRequestLink'

interface Props {
  username: string | null
  address: string
  onClose: () => void
}

export default function PlaneRequestQr({ username, address, onClose }: Props) {
  const toParam = planeRequestToParam(username, address)
  const link = planeRequestUrl(toParam)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setQrError(null)

    QRCode.toDataURL(link, {
      margin: 1,
      width: 240,
      color: { dark: '#1a2744', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrError('could not render QR')
      })

    return () => {
      cancelled = true
    }
  }, [link])

  const label = username ? `@${username}` : 'your address'

  return (
    <div className="profile-overlay" role="dialog" aria-modal="true">
      <section className="card card-elevated plane-qr-card">
        <div className="row-head">
          <div>
            <p className="eyebrow">Plane request</p>
            <h2 className="screen-title">My QR</h2>
          </div>
          <button type="button" className="text-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="hint">
          Scan to open Send to {label}. They choose amount and note in Nimiq Pay.
        </p>

        <div className="plane-qr-wrap">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code to send a plane to ${label}`}
              className="plane-qr-img"
            />
          ) : qrError ? (
            <p className="error">{qrError}</p>
          ) : (
            <div className="loader-row">
              <span className="loader" aria-hidden="true" />
            </div>
          )}
        </div>

        <p className="hint small-hint plane-qr-link">{link}</p>
      </section>
    </div>
  )
}
