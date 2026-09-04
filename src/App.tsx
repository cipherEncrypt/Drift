import { useEffect, useState } from 'react'
import {
  appUrl,
  isMobile,
  isNimiqPayHost,
  nimiqPayDeeplink,
} from './lib/deeplink'
import { tryGetProfileByAddress } from './lib/api'
import { parseSendHash, consumeSendHash } from './lib/planeRequestLink'
import { useNimiq } from './hooks/useNimiq'
import { useInbox } from './hooks/useInbox'
import { ProfileProvider, useProfiles } from './context/ProfileContext'
import AppBar from './components/AppBar'
import NavDock from './components/NavDock'
import ProfileClaim from './components/ProfileClaim'
import PlaneRequestQr from './components/PlaneRequestQr'
import Sky from './screens/Sky'
import Compose from './screens/Compose'
import Inbox from './screens/Inbox'
import Claim from './screens/Claim'

type Tab = 'sky' | 'send' | 'inbox'
type Screen = Tab | 'claim'

const OPEN_PAY_KEY = 'drift_open_pay'
const SKIP_PROFILE_KEY = 'drift_skip_profile'

function AppShell({
  address,
  inboxState,
}: {
  address: string
  inboxState: ReturnType<typeof useInbox>
}) {
  const { setUsername } = useProfiles()
  const [tab, setTab] = useState<Tab>(() => (parseSendHash() ? 'send' : 'sky'))
  const [screen, setScreen] = useState<Screen>(() => (parseSendHash() ? 'send' : 'sky'))
  const [claimPlaneId, setClaimPlaneId] = useState<string | null>(null)
  const [ownUsername, setOwnUsername] = useState<string | null>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [profileSkipped, setProfileSkipped] = useState(
    () => sessionStorage.getItem(SKIP_PROFILE_KEY) === '1',
  )
  const [showQr, setShowQr] = useState(false)
  const [sendPrefill, setSendPrefill] = useState<string | null>(() => parseSendHash())

  function applySendHashFromUrl() {
    const to = parseSendHash()
    if (!to) return
    setTab('send')
    setScreen('send')
    setSendPrefill(to)
    consumeSendHash()
  }

  useEffect(() => {
    applySendHashFromUrl()
    window.addEventListener('hashchange', applySendHashFromUrl)
    return () => window.removeEventListener('hashchange', applySendHashFromUrl)
  }, [])

  useEffect(() => {
    let cancelled = false
    tryGetProfileByAddress(address)
      .then((profile) => {
        if (cancelled) return
        if (profile) {
          setOwnUsername(profile.username)
          setUsername(address, profile.username)
        } else {
          setOwnUsername(null)
        }
        setProfileLoadError(null)
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileLoadError(err instanceof Error ? err.message : 'profile load failed')
        }
      })
      .finally(() => {
        if (!cancelled) setProfileChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [address, setUsername])

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

  function handleProfileClaimed(username: string) {
    setOwnUsername(username)
    setUsername(address, username)
    setProfileSkipped(false)
    sessionStorage.removeItem(SKIP_PROFILE_KEY)
  }

  function handleProfileSkip() {
    setProfileSkipped(true)
    sessionStorage.setItem(SKIP_PROFILE_KEY, '1')
  }

  const isSky = tab === 'sky' && screen !== 'claim'
  const needsProfile =
    profileChecked && ownUsername === null && !profileSkipped && !profileLoadError

  return (
    <main className={`app${isSky ? ' app-sky' : ''}`}>
      <AppBar
        address={address}
        username={ownUsername}
        onMyQr={() => setShowQr(true)}
      />

      {profileLoadError && (
        <p className="error app-banner-error">{profileLoadError}</p>
      )}

      <div className="app-body">
        {screen === 'claim' && claimPlaneId ? (
          <Claim
            planeId={claimPlaneId}
            address={address}
            onBack={goInbox}
            onOpened={inboxState.refresh}
          />
        ) : tab === 'sky' ? (
          <Sky walletAddress={address} />
        ) : tab === 'send' ? (
          <Compose fromAddress={address} initialTo={sendPrefill} />
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

      {needsProfile && (
        <ProfileClaim
          address={address}
          onClaimed={handleProfileClaimed}
          onSkip={handleProfileSkip}
        />
      )}

      {showQr && (
        <PlaneRequestQr
          username={ownUsername}
          address={address}
          onClose={() => setShowQr(false)}
        />
      )}
    </main>
  )
}

export default function App() {
  const { address, loading, error } = useNimiq()
  const inboxState = useInbox(address ?? '')
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

  return (
    <ProfileProvider>
      <AppShell address={address} inboxState={inboxState} />
    </ProfileProvider>
  )
}
