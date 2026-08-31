type Tab = 'sky' | 'send' | 'inbox'

interface Props {
  tab: Tab
  inboxBadge?: number
  onSky: () => void
  onSend: () => void
  onInbox: () => void
}

function IconSky() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  )
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12L20 4L14 20L11 13L4 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M4 8l8 5 8-5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export default function NavDock({
  tab,
  inboxBadge = 0,
  onSky,
  onSend,
  onInbox,
}: Props) {
  return (
    <nav className="nav-dock" aria-label="Main">
      <button
        type="button"
        className={tab === 'sky' ? 'dock-btn active' : 'dock-btn'}
        onClick={onSky}
      >
        <IconSky />
        <span>Sky</span>
      </button>
      <button
        type="button"
        className={tab === 'send' ? 'dock-btn active' : 'dock-btn'}
        onClick={onSend}
      >
        <IconSend />
        <span>Send</span>
      </button>
      <button
        type="button"
        className={tab === 'inbox' ? 'dock-btn active' : 'dock-btn'}
        onClick={onInbox}
      >
        <span className="dock-icon-wrap">
          <IconInbox />
          {inboxBadge > 0 && (
            <span className="dock-badge" aria-label={`${inboxBadge} incoming`}>
              {inboxBadge > 9 ? '9+' : inboxBadge}
            </span>
          )}
        </span>
        <span>Inbox</span>
      </button>
    </nav>
  )
}
