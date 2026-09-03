import { shortAddr } from '../lib/inboxHelpers'

interface Props {
  address?: string
  username?: string | null
  compact?: boolean
  onMyQr?: () => void
}

export default function AppBar({ address, username, compact, onMyQr }: Props) {
  const walletLabel = address
    ? username
      ? `@${username}`
      : shortAddr(address)
    : null

  return (
    <header className={`app-bar${compact ? ' app-bar-compact' : ''}`}>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 18L26 6L16 28L14 18L4 18Z"
              fill="currentColor"
              fillOpacity="0.15"
            />
            <path
              d="M4 18L26 6L14 18M14 18L16 28L26 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="brand-text">
          <span className="brand-name">Drift</span>
          {!compact && <span className="brand-tag">Paper planes with NIM</span>}
        </div>
      </div>

      {address && (
        <div className="app-bar-actions">
          {onMyQr && (
            <button type="button" className="text-btn app-bar-qr" onClick={onMyQr}>
              My QR
            </button>
          )}
          {walletLabel && <span className="wallet-chip">{walletLabel}</span>}
        </div>
      )}
    </header>
  )
}
