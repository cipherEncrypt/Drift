import { useCallback, useEffect, useState } from 'react'
import { getInbox } from '../lib/api'
import { unreadCount } from '../lib/inboxHelpers'
import type { InboxPlane } from '../types/plane'

export function useInbox(address: string) {
  const [planes, setPlanes] = useState<InboxPlane[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!address.trim()) {
      setPlanes([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { planes: list } = await getInbox(address)
      setPlanes(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'inbox load failed')
      setPlanes([])
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    refresh()
    if (!address.trim()) return undefined
    const id = setInterval(refresh, 20000)
    return () => clearInterval(id)
  }, [refresh, address])

  return {
    planes,
    loading,
    error,
    refresh,
    unread: unreadCount(planes),
  }
}
