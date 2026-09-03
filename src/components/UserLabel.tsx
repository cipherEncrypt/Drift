import { useEffect } from 'react'
import { useProfiles } from '../context/ProfileContext'
import { formatUserLabel } from '../lib/profiles'

interface Props {
  address: string
  className?: string
}

export default function UserLabel({ address, className }: Props) {
  const { loadAddresses, getUsername } = useProfiles()

  useEffect(() => {
    loadAddresses([address])
  }, [address, loadAddresses])

  const username = getUsername(address)
  return (
    <span className={className}>{formatUserLabel(username, address)}</span>
  )
}
