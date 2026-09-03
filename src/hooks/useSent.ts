import { useCallback, useEffect, useState } from 'react'
import { getSent } from '../lib/api'
import type { PublicPlane } from '../types/plane'

export function useSent(address: string) {
  const [planes, setPlanes] = useState<PublicPlane[]>([])
  const [loading, setLoading] = useState(Boolean(address))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!address) {
      setPlanes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    getSent(address)
      .then((data) => setPlanes(data.planes))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'load failed')
      })
      .finally(() => setLoading(false))
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { planes, loading, error, refresh }
}
