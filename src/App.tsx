import { useEffect, useState } from 'react'
import { listAccounts } from './lib/nimiq'

type Status = 'connecting' | 'ready' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>('connecting')
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const accounts = await listAccounts()
        if (cancelled) return
        setAddress(accounts[0] ?? null)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to connect')
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
          </>
        )}

        {status === 'ready' && !address && (
          <p className="status">No Nimiq accounts returned.</p>
        )}

        {status === 'error' && (
          <>
            <p className="label error-label">Not connected</p>
            <p className="error">{error}</p>
            <p className="hint">
              Open this URL inside Nimiq Pay&apos;s Mini Apps section, not in
              Chrome.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
