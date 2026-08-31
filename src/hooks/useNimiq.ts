import { useEffect, useState } from 'react'
import { listAccounts } from '../lib/nimiq'

export function useNimiq() {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const accounts = await listAccounts()
        if (!cancelled) {
          setAddress(accounts[0] ?? null)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setAddress(null)
          setError(err instanceof Error ? err.message : 'wallet error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { address, loading, error }
}
