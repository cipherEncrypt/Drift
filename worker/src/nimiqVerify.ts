import * as ed from '@noble/ed25519'
import { blake2b } from '@noble/hashes/blake2.js'
import { normalizeAddress } from './db'

const MSG_PREFIX = '\x16Nimiq Signed Message:\n'
const BASE32 = '0123456789ABCDEFGHJKLMNPQRSTUVXY'

function stripHex(value: string): string {
  return value.replace(/\s/g, '').replace(/^0x/i, '')
}

function parseWireBytes(value: string): Uint8Array {
  const cleaned = value.replace(/\s/g, '')
  const hex = cleaned.replace(/^0x/i, '')
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
    const out = new Uint8Array(hex.length / 2)
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return out
  }

  const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function publicKeyCandidates(bytes: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = []
  const seen = new Set<string>()
  const add = (key: Uint8Array) => {
    const id = Array.from(key).join(',')
    if (key.length === 32 && !seen.has(id)) {
      seen.add(id)
      out.push(key)
    }
  }

  if (bytes.length === 32) add(bytes)
  if (bytes.length === 33) add(bytes.subarray(1))
  if (bytes.length === 64) {
    add(bytes.subarray(0, 32))
    add(bytes.subarray(32))
  }
  if (bytes.length > 32) add(bytes.subarray(bytes.length - 32))

  return out
}

function signatureCandidates(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length === 64) return [bytes]
  if (bytes.length > 64) {
    return [bytes.subarray(0, 64), bytes.subarray(bytes.length - 64)]
  }
  return []
}

function prefixedMessagePayloads(message: string): Uint8Array[] {
  const messageBytes = new TextEncoder().encode(message)
  const lengths = [String(messageBytes.length), String(message.length)]
  const out: Uint8Array[] = []

  for (const len of lengths) {
    const prefix = new TextEncoder().encode(MSG_PREFIX + len)
    const data = new Uint8Array(prefix.length + messageBytes.length)
    data.set(prefix, 0)
    data.set(messageBytes, prefix.length)
    out.push(data)
  }

  return out
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return new Uint8Array(digest)
}

async function signedMessageData(message: string): Promise<Uint8Array[]> {
  const raw = new TextEncoder().encode(message)
  const hashes: Uint8Array[] = []
  for (const payload of prefixedMessagePayloads(message)) {
    hashes.push(await sha256(payload))
  }
  return [...hashes, ...prefixedMessagePayloads(message), raw]
}

function ibanMod97(input: string): number {
  let rem = 0
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') {
      rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97
    } else if (ch >= 'A' && ch <= 'Z') {
      const n = ch.charCodeAt(0) - 55
      rem = (rem * 10 + Math.floor(n / 10)) % 97
      rem = (rem * 10 + (n % 10)) % 97
    }
  }
  return rem
}

function base32Encode(bytes: Uint8Array): string {
  let out = ''
  let acc = 0
  let bits = 0
  for (const b of bytes) {
    acc = (acc << 8) | b
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += BASE32[(acc >> bits) & 31]
    }
  }
  return out
}

function addressFromEd25519PublicKey(pub: Uint8Array): string {
  const hash = blake2b(pub, { dkLen: 32 })
  const payload = base32Encode(hash.subarray(0, 20))
  const check = 98 - ibanMod97(`${payload}NQ00`)
  const compact = `NQ${String(check).padStart(2, '0')}${payload}`
  let formatted = ''
  for (let i = 0; i < compact.length; i += 4) {
    if (i > 0) formatted += ' '
    formatted += compact.slice(i, i + 4)
  }
  return formatted
}

async function verifyNimiqMessage(
  message: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  const sigBytes = parseWireBytes(signatureHex)
  const pubBytes = parseWireBytes(publicKeyHex)
  const sigs = signatureCandidates(sigBytes)
  const pubs = publicKeyCandidates(pubBytes)
  if (sigs.length === 0 || pubs.length === 0) return false

  const datas = await signedMessageData(message)

  for (const sig of sigs) {
    for (const pub of pubs) {
      for (const data of datas) {
        if (await ed.verifyAsync(sig, data, pub)) return true
      }
    }
  }

  return false
}

export async function addressFromPublicKey(publicKeyHex: string): Promise<string> {
  const pubs = publicKeyCandidates(parseWireBytes(publicKeyHex))
  if (pubs.length === 0) throw new Error('invalid public key')
  return addressFromEd25519PublicKey(pubs[0])
}

export async function verifyClaimSig(
  planeId: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  return verifyNimiqMessage(`claim:${planeId}`, publicKeyHex, signatureHex)
}

export async function verifyNameSig(
  username: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  return verifyNimiqMessage(`drift:name:${username}`, publicKeyHex, signatureHex)
}

export async function verifyCitySig(
  slug: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  return verifyNimiqMessage(`drift:city:${slug}`, publicKeyHex, signatureHex)
}

export function addressesMatch(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b)
}

export async function debugNimiqVerify(
  message: string,
  publicKeyHex: string,
  signatureHex: string,
  claimedAddress: string,
): Promise<Record<string, unknown>> {
  let sigLen = 0
  let pubLen = 0
  let verifyOk = false
  let verifyError = ''
  let derived = ''

  try {
    const sigBytes = parseWireBytes(signatureHex)
    const pubBytes = parseWireBytes(publicKeyHex)
    sigLen = sigBytes.length
    pubLen = pubBytes.length
    verifyOk = await verifyNimiqMessage(message, publicKeyHex, signatureHex)
  } catch (err) {
    verifyError = err instanceof Error ? err.message : 'verify failed'
  }

  try {
    derived = await addressFromPublicKey(publicKeyHex)
  } catch (err) {
    derived = err instanceof Error ? err.message : 'derive failed'
  }

  return {
    message,
    sigLen,
    pubLen,
    sigCandidates: signatureCandidates(parseWireBytes(signatureHex)).length,
    pubCandidates: publicKeyCandidates(parseWireBytes(publicKeyHex)).length,
    verifyOk,
    verifyError,
    derived,
    claimed: claimedAddress,
    addressMatch: addressesMatch(derived, claimedAddress),
  }
}
