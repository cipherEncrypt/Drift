import { getProfileByUsername } from '../lib/api'
import {
  looksLikeNimiqAddress,
  normalizeUsernameInput,
} from '../lib/profiles'

export async function resolveRecipientAddress(input: string): Promise<string> {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('recipient required')

  if (looksLikeNimiqAddress(trimmed)) {
    return trimmed.replace(/\s/g, '')
  }

  const username = normalizeUsernameInput(trimmed)
  if (!username) throw new Error('invalid username or address')

  const profile = await getProfileByUsername(username)
  if (!profile) throw new Error('username not found')

  return profile.address
}
