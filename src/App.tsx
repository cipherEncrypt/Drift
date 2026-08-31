import { useEffect, useState } from 'react'
import {
  appUrl,
  isMobile,
  isNimiqPayHost,
  nimiqPayDeeplink,
} from './lib/deeplink'
import { useNimiq } from './hooks/useNimiq'
import Compose from './screens/Compose'
import Inbox from './screens/Inbox'
import Claim from './screens/Claim'

type Tab = 'send' | 'inbox'
type Screen = Tab | 'claim'

const OPEN_PAY_KEY = 'drift_open_pay'

export default function App() {
  const { address, loading, error } = useNimiq()
  const [tab, setTab] = useState<Tab>('send')
  const [screen, setScreen] = useState<Screen>('send')
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
  }

  if (!isNimiqPayHost() && !loading && !address) {
    return (
      <main className="app">
        <header className="header">
          <h1>Drift</h1>
          <p className="subtitle">Paper planes with NIM</p>
        </header>
        <section className="card">
          <p className="label error-label">Open in Nimiq Pay</p>
          <p className="hint">
            Safari and Chrome cannot run Mini Apps. Tap below to open Drift in
            Nimiq Pay.
          </p>
          <a className="pay-button" href={deeplink}>Open in Nimiq Pay</a>
          <p className="hint small-hint">Or paste in Pay Discover: {appUrl()}</p>
        </section>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="app">
        <header className="header">
          <h1>Drift</h1>
          <p className="subtitle">Paper planes with NIM</p>
        </header>
        <section className="card">
          <p className="status">Connecting…</p>
        </section>
      </main>
    )
  }

  if (!address) {
    return (
      <main className="app">
        <header className="header">
          <h1>Drift</h1>
          <p className="subtitle">Paper planes with NIM</p>
        </header>
        <section className="card">
          <p className="error">{error ?? 'No wallet connected'}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="header">
        <h1>Drift</h1>
        <p className="subtitle">Paper planes with NIM</p>
      </header>

      {screen === 'claim' && claimPlaneId ? (
        <Claim
          planeId={claimPlaneId}
          address={address}
          onBack={goInbox}
        />
      ) : tab === 'send' ? (
        <Compose fromAddress={address} onSent={goInbox} />
      ) : (
        <Inbox address={address} onOpen={openClaim} />
      )}

      {screen !== 'claim' && (
        <nav className="nav">
          <button
            type="button"
            className={tab === 'send' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => {
              setTab('send')
              setScreen('send')
            }}
          >
            Send
          </button>
          <button
            type="button"
            className={tab === 'inbox' ? 'nav-btn active' : 'nav-btn'}
            onClick={goInbox}
          >
            Inbox
          </button>
        </nav>
      )}
    </main>
  )
}
