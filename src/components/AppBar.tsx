function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

interface Props {
  address?: string
  compact?: boolean
}

export default function AppBar({ address, compact }: Props) {
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
      {address && <span className="wallet-chip">{shortAddr(address)}</span>}
    </header>
  )
}
