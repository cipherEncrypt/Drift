import { useEffect, useState } from 'react'
import {
  appUrl,
  isMobile,
  isNimiqPayHost,
  nimiqPayDeeplink,
} from './lib/deeplink'
import { useNimiq } from './hooks/useNimiq'
import { useInbox } from './hooks/useInbox'
import AppBar from './components/AppBar'
import NavDock from './components/NavDock'
import Sky from './screens/Sky'
import Compose from './screens/Compose'
import Inbox from './screens/Inbox'
import Claim from './screens/Claim'

type Tab = 'sky' | 'send' | 'inbox'
type Screen = Tab | 'claim'

const OPEN_PAY_KEY = 'drift_open_pay'

export default function App() {
  const { address, loading, error } = useNimiq()
  const inboxState = useInbox(address ?? '')
  const [tab, setTab] = useState<Tab>('sky')
  const [screen, setScreen] = useState<Screen>('sky')
  const [claimPlaneId, setClaimPlaneId] = useState<string | null>(null)
  const deeplink = nimiqPayDeeplink()

  useEffect(() => {
    if (isNimiqPayHost()) return
    if (!isMobile()) return
    if (sessionStorage.getItem(OPEN_PAY_KEY)) return

    sessionStorage.setItem(OPEN_PAY_KEY, '1')
    window.location.href = deeplink
  }, [deeplink])

  useEffect(() => {
    if (address) sessionStorage.removeItem(OPEN_PAY_KEY)
  }, [address])

  function openClaim(planeId: string) {
    setClaimPlaneId(planeId)
    setScreen('claim')
  }

  function goInbox() {
    setTab('inbox')
    setScreen('inbox')
    setClaimPlaneId(null)
    inboxState.refresh()
  }

  function goSky() {
    setTab('sky')
    setScreen('sky')
    setClaimPlaneId(null)
  }

  function goSend() {
    setTab('send')
    setScreen('send')
    setClaimPlaneId(null)
  }

  if (!isNimiqPayHost() && !loading && !address) {
    return (
      <main className="app app-gate">
        <AppBar />
        <section className="card card-elevated">
          <p className="eyebrow">Nimiq Pay required</p>
          <h2 className="gate-title">Open in Nimiq Pay</h2>
          <p className="hint">
            Safari and Chrome cannot run Mini Apps. Tap below to open Drift in
            Nimiq Pay.
          </p>
          <a className="btn-primary" href={deeplink}>Open in Nimiq Pay</a>
          <p className="hint small-hint">Or paste in Pay Discover: {appUrl()}</p>
        </section>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="app app-gate">
        <AppBar />
        <section className="card card-elevated">
          <div className="loader-row">
            <span className="loader" aria-hidden="true" />
            <p className="status">Connecting wallet…</p>
          </div>
        </section>
      </main>
    )
  }

  if (!address) {
    return (
      <main className="app app-gate">
        <AppBar />
        <section className="card card-elevated">
          <p className="error">{error ?? 'No wallet connected'}</p>
        </section>
      </main>
    )
  }

  const isSky = tab === 'sky' && screen !== 'claim'

  return (
    <main className={`app${isSky ? ' app-sky' : ''}`}>
      <AppBar address={address} compact={isSky} />

      <div className="app-body">
        {screen === 'claim' && claimPlaneId ? (
          <Claim
            planeId={claimPlaneId}
            address={address}
            onBack={goInbox}
          />
        ) : tab === 'sky' ? (
          <Sky walletAddress={address} />
        ) : tab === 'send' ? (
          <Compose fromAddress={address} onSent={goSky} />
        ) : (
          <Inbox
            planes={inboxState.planes}
            loading={inboxState.loading}
            error={inboxState.error}
            refresh={inboxState.refresh}
            onOpen={openClaim}
          />
        )}
      </div>

      {screen !== 'claim' && (
        <NavDock
          tab={tab}
          onSky={goSky}
          onSend={goSend}
          onInbox={goInbox}
          inboxBadge={inboxState.unread}
        />
      )}
    </main>
  )
}
