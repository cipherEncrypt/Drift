import init, { Hash, PublicKey, Signature } from '@nimiq/core/web'
import { normalizeAddress } from './db'

const MSG_PREFIX = '\x16Nimiq Signed Message:\n'

let wasmReady: Promise<void> | null = null

function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = init().then(() => undefined)
  }
  return wasmReady
}

function nimiqMessageBytes(message: string): Uint8Array {
  const enc = new TextEncoder()
  const messageBytes = enc.encode(message)
  const prefixBytes = enc.encode(MSG_PREFIX)
  const lengthBytes = enc.encode(String(messageBytes.byteLength))
  const out = new Uint8Array(prefixBytes.length + lengthBytes.length + messageBytes.length)
  out.set(prefixBytes, 0)
  out.set(lengthBytes, prefixBytes.length)
  out.set(messageBytes, prefixBytes.length + lengthBytes.length)
  return out
}

async function nimiqMessageHash(message: string): Promise<Uint8Array> {
  await ensureWasm()
  return Hash.computeSha256(nimiqMessageBytes(message))
}

export async function addressFromPublicKey(publicKeyHex: string): Promise<string> {
  await ensureWasm()
  const pubKey = PublicKey.fromHex(publicKeyHex)
  return pubKey.toAddress().toUserFriendlyAddress()
}

export async function verifyClaimSig(
  planeId: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  await ensureWasm()
  const pubKey = PublicKey.fromHex(publicKeyHex)
  const sig = Signature.fromHex(signatureHex)
  const hash = await nimiqMessageHash(`claim:${planeId}`)
  return pubKey.verify(sig, hash)
}

export async function verifyNameSig(
  username: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  await ensureWasm()
  const pubKey = PublicKey.fromHex(publicKeyHex)
  const sig = Signature.fromHex(signatureHex)
  const hash = await nimiqMessageHash(`drift:name:${username}`)
  return pubKey.verify(sig, hash)
}

export function addressesMatch(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b)
}
