import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getProfileBatch } from '../lib/api'
import { normalizeAddress } from '../lib/profiles'

interface ProfileContextValue {
  loadAddresses: (addresses: string[]) => void
  getUsername: (address: string | null | undefined) => string | undefined
  setUsername: (address: string, username: string) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<Record<string, string>>({})
  const pendingRef = useRef<Set<string>>(new Set())
  const [map, setMap] = useState<Record<string, string>>({})

  const loadAddresses = useCallback((addresses: string[]) => {
    const toFetch: string[] = []
    for (const addr of addresses) {
      if (!addr) continue
      const trimmed = addr.trim()
      const norm = normalizeAddress(trimmed)
      if (mapRef.current[norm] || pendingRef.current.has(norm)) continue
      pendingRef.current.add(norm)
      toFetch.push(trimmed)
    }
    if (toFetch.length === 0) return

    void (async () => {
      try {
        const { profiles } = await getProfileBatch(toFetch)
        const updates: Record<string, string> = {}
        for (const profile of profiles) {
          const norm = normalizeAddress(profile.address)
          updates[norm] = profile.username
          pendingRef.current.delete(norm)
        }
        for (const addr of toFetch) {
          pendingRef.current.delete(normalizeAddress(addr))
        }
        if (Object.keys(updates).length === 0) return
        mapRef.current = { ...mapRef.current, ...updates }
        setMap({ ...mapRef.current })
      } catch {
        for (const addr of toFetch) {
          pendingRef.current.delete(normalizeAddress(addr))
        }
      }
    })()
  }, [])

  const getUsername = useCallback(
    (address: string | null | undefined) => {
      if (!address) return undefined
      return map[normalizeAddress(address)]
    },
    [map],
  )

  const setUsername = useCallback((address: string, username: string) => {
    const norm = normalizeAddress(address)
    mapRef.current = { ...mapRef.current, [norm]: username }
    setMap({ ...mapRef.current })
  }, [])

  const value = useMemo(
    () => ({ loadAddresses, getUsername, setUsername }),
    [loadAddresses, getUsername, setUsername],
  )

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  )
}

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfiles requires ProfileProvider')
  return ctx
}
