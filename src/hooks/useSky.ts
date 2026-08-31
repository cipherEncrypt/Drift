import { useCallback, useEffect, useState } from 'react'
import { getSky } from '../lib/api'
import type { PublicPlane } from '../types/plane'

export function useSky() {
  const [planes, setPlanes] = useState<PublicPlane[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { planes: list } = await getSky()
      setPlanes(list)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'sky load failed')
      setPlanes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15000)
    return () => clearInterval(id)
  }, [refresh])

  return { planes, loading, error, refresh, setPlanes }
}
