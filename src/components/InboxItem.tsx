import { lunaToNim } from '../lib/luna'
import {
  flightProgressPct,
  hasCheers,
  inboxStatusLabel,
} from '../lib/inboxHelpers'
import UserLabel from './UserLabel'
import { useNow } from '../hooks/useFlightProgress'
import type { InboxPlane } from '../types/plane'

interface Props {
  plane: InboxPlane
  onOpen: () => void
}

export default function InboxItem({ plane, onOpen }: Props) {
  const now = useNow(30000)
  const { label, tone } = inboxStatusLabel(plane, now)
  const progress = flightProgressPct(plane, now)
  const showProgress = plane.status !== 'opened' && progress < 100

  return (
    <li>
      <button type="button" className="inbox-item" onClick={onOpen}>
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
              <UserLabel address={plane.fromAddress} />
            </span>
            <span className={`status-pill tone-${tone}`}>{label}</span>
          </span>

          <span className="inbox-item-meta">
            <span className="inbox-amount">{lunaToNim(plane.totalLuna)} NIM</span>
            {hasCheers(plane) && (
              <span className="inbox-cheer-tag">includes cheers</span>
            )}
          </span>

          {showProgress && (
            <span className="inbox-progress" aria-hidden="true">
              <span
                className="inbox-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </span>
          )}
        </span>

        <span className="inbox-chevron" aria-hidden="true">›</span>
      </button>
    </li>
  )
}
