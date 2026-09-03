import { Address, PublicKey, Signature } from '@nimiq/core/web'
import { normalizeAddress } from './db'

function nimiqMessageBytes(message: string): Uint8Array {
  const prefixed = `\x16Nimiq Signed Message:\n${message.length}${message}`
  return new TextEncoder().encode(prefixed)
}

export function addressFromPublicKey(publicKeyHex: string): string {
  const pubKey = PublicKey.fromHex(publicKeyHex)
  return pubKey.toAddress().toUserFriendlyAddress()
}

export function verifyClaimSig(
  planeId: string,
  publicKeyHex: string,
  signatureHex: string,
): boolean {
  const pubKey = PublicKey.fromHex(publicKeyHex)
  const sig = Signature.fromHex(signatureHex)
  const data = nimiqMessageBytes(`claim:${planeId}`)
  return pubKey.verify(sig, data)
}

export function verifyNameSig(
  username: string,
  publicKeyHex: string,
  signatureHex: string,
): boolean {
  const pubKey = PublicKey.fromHex(publicKeyHex)
  const sig = Signature.fromHex(signatureHex)
  const data = nimiqMessageBytes(`drift:name:${username}`)
  return pubKey.verify(sig, data)
}

export function addressesMatch(a: string, b: string): boolean {
  return normalizeAddress(a) === normalizeAddress(b)
}
