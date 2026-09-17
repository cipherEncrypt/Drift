import { shortAddr } from '../lib/inboxHelpers'

interface Props {
  address?: string
  username?: string | null
  cityLabel?: string | null
  onMyQr?: () => void
  onSetCity?: () => void
}

export default function AppBar({
  address,
  username,
  cityLabel,
  onMyQr,
  onSetCity,
}: Props) {
  const walletLabel = address
    ? username
      ? `@${username}`
      : shortAddr(address)
    : null

  return (
    <header className="app-bar">
      <div className="app-bar-inner">
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
          <span className="brand-name">Drift</span>
        </div>

        {address && (
          <div className="app-bar-actions">
            {onMyQr && (
              <button
                type="button"
                className="app-bar-icon-btn"
                onClick={onMyQr}
                aria-label="Show my QR code"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
            {onSetCity && username && (
              <button type="button" className="app-bar-city" onClick={onSetCity}>
                {cityLabel ?? 'Set city'}
              </button>
            )}
            {walletLabel && (
              <span className="app-bar-user" title={address}>
                {walletLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
