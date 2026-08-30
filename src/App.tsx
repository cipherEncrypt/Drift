import { useEffect, useState } from 'react'
import { listAccounts } from './lib/nimiq'
import {
  appUrl,
  isMobile,
  isNimiqPayHost,
  nimiqPayDeeplink,
} from './lib/deeplink'

type Status = 'connecting' | 'ready' | 'error'

const OPEN_PAY_KEY = 'drift_open_pay'

export default function App() {
  const [status, setStatus] = useState<Status>('connecting')
  const [address, setAddress] = useState<string | null>(null)
  const deeplink = nimiqPayDeeplink()

  useEffect(() => {
    if (isNimiqPayHost()) return
    if (!isMobile()) return
    if (sessionStorage.getItem(OPEN_PAY_KEY)) return

    sessionStorage.setItem(OPEN_PAY_KEY, '1')
    window.location.href = deeplink
  }, [deeplink])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const accounts = await listAccounts()
        if (cancelled) return
        setAddress(accounts[0] ?? null)
        setStatus('ready')
        sessionStorage.removeItem(OPEN_PAY_KEY)
      } catch {
        if (cancelled) return
        setStatus('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <header className="header">
        <p className="tag">Phase 0</p>
        <h1>Drift</h1>
        <p className="subtitle">Paper planes with NIM</p>
      </header>

      <section className="card" aria-live="polite">
        {status === 'connecting' && (
          <p className="status">Connecting to Nimiq Pay…</p>
        )}

        {status === 'ready' && address && (
          <>
            <p className="label">Your Nimiq address</p>
            <p className="address">{address}</p>
            <p className="hint share-hint">
              Share link (opens in Pay):{' '}
              <a className="text-link" href={deeplink}>{deeplink}</a>
            </p>
          </>
        )}

        {status === 'ready' && !address && (
          <p className="status">No Nimiq accounts returned.</p>
        )}

        {status === 'error' && (
          <>
            <p className="label error-label">Open in Nimiq Pay</p>
            <p className="hint">
              Safari and Chrome cannot run Mini Apps. Tap below to open Drift in
              Nimiq Pay.
            </p>
            <a className="pay-button" href={deeplink}>Open in Nimiq Pay</a>
            <p className="hint small-hint">
              Or paste in Pay Discover: {appUrl()}
            </p>
          </>
        )}
      </section>
    </main>
  )
}
