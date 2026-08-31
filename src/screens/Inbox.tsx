import { inboxSection } from '../lib/inboxHelpers'
import InboxItem from '../components/InboxItem'
import type { InboxPlane } from '../types/plane'

interface Props {
  planes: InboxPlane[]
  loading: boolean
  error: string | null
  refresh: () => void
  onOpen: (planeId: string) => void
}

function InboxSection({
  title,
  hint,
  planes,
  onOpen,
}: {
  title: string
  hint?: string
  planes: InboxPlane[]
  onOpen: (id: string) => void
}) {
  if (planes.length === 0) return null

  return (
    <div className="inbox-section">
      <div className="inbox-section-head">
        <h3 className="inbox-section-title">{title}</h3>
        <span className="inbox-section-count">{planes.length}</span>
      </div>
      {hint && <p className="hint inbox-section-hint">{hint}</p>}
      <ul className="inbox-list">
        {planes.map((plane) => (
          <InboxItem key={plane.id} plane={plane} onOpen={() => onOpen(plane.id)} />
        ))}
      </ul>
    </div>
  )
}

export default function Inbox({ planes, loading, error, refresh, onOpen }: Props) {
  const incoming = planes.filter((p) => inboxSection(p) === 'incoming')
  const opened = planes.filter((p) => inboxSection(p) === 'opened')

  return (
    <section className="inbox-screen">
      <div className="inbox-hero card card-elevated">
        <div className="row-head">
          <div>
            <p className="eyebrow">For you</p>
            <h2 className="screen-title">Inbox</h2>
          </div>
          <button type="button" className="text-btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
        <p className="hint inbox-hero-hint">
          Planes sent to your wallet land here. Sign to open sealed notes.
        </p>

        {!loading && !error && planes.length > 0 && (
          <div className="inbox-stats">
            <div className="inbox-stat">
              <span className="inbox-stat-value">{incoming.length}</span>
              <span className="inbox-stat-label">incoming</span>
            </div>
            <div className="inbox-stat">
              <span className="inbox-stat-value">{opened.length}</span>
              <span className="inbox-stat-label">opened</span>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loader-row inbox-loader">
          <span className="loader" aria-hidden="true" />
          <p className="status">Loading inbox…</p>
        </div>
      )}

      {error && <p className="error inbox-error">{error}</p>}

      {!loading && !error && planes.length === 0 && (
        <div className="empty-block inbox-empty">
          <div className="inbox-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <path
                d="M12 24h40v28a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V24Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M12 24l20 12 20-12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <p className="empty-title">Nothing yet</p>
          <p className="hint">When someone sends you a plane, it shows up here.</p>
        </div>
      )}

      {!loading && !error && planes.length > 0 && (
        <div className="inbox-sections">
          <InboxSection
            title="Incoming"
            hint="Open the note anytime. NIM is already in your wallet."
            planes={incoming}
            onOpen={onOpen}
          />
          <InboxSection
            title="Opened"
            hint="Tap to read the note again."
            planes={opened}
            onOpen={onOpen}
          />
        </div>
      )}
    </section>
  )
}
