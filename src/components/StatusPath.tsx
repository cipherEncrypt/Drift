import type { PublicPlane } from '../types/plane'
import { privatePlaneStatusStep } from '../lib/planeStatus'

const STEPS = ['In flight', 'Delivered', 'Opened'] as const

interface Props {
  plane: PublicPlane
}

export default function StatusPath({ plane }: Props) {
  const active = privatePlaneStatusStep(plane)

  return (
    <ol className="status-path" aria-label="Delivery status">
      {STEPS.map((label, index) => {
        const done = index < active
        const current = index === active
        return (
          <li
            key={label}
            className={`status-path-step${done ? ' done' : ''}${current ? ' current' : ''}`}
          >
            <span className="status-path-mark" aria-hidden="true">
              {done ? '✓' : current ? '●' : '○'}
            </span>
            <span className="status-path-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
