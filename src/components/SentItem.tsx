import { lunaToNim } from '../lib/luna'
import { privatePlaneStatusLabel } from '../lib/planeStatus'
import { useNow } from '../hooks/useFlightProgress'
import UserLabel from './UserLabel'
import type { PublicPlane } from '../types/plane'

interface Props {
  plane: PublicPlane
  onOpen: () => void
}

export default function SentItem({ plane, onOpen }: Props) {
  const now = useNow(30000)
  const { label, tone } = privatePlaneStatusLabel(plane, now)

  return (
    <li>
      <button type="button" className="inbox-item sent-item" onClick={onOpen}>
        <span className="inbox-item-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12L20 4L12 20L10 12L4 12Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="inbox-item-body">
          <span className="inbox-item-top">
            <span className="inbox-from">
              To{' '}
              {plane.toAddress ? <UserLabel address={plane.toAddress} /> : '—'}
            </span>
            <span className={`status-pill tone-${tone}`}>{label}</span>
          </span>

          <span className="inbox-item-meta">
            <span className="inbox-amount">{lunaToNim(plane.amountLuna)} NIM</span>
          </span>
        </span>

        <span className="inbox-chevron" aria-hidden="true">›</span>
      </button>
    </li>
  )
}
