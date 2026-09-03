import init, {
  Address,
  KeyPair,
  PrivateKey,
  TransactionBuilder,
} from '@nimiq/core/web'
import type { Env } from './env'
import { nimiqBlockHeight, nimiqRpc } from './nimiqRpc'

let wasmReady: Promise<void> | null = null

function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = init().then(() => undefined)
  }
  return wasmReady
}

export function treasuryConfigured(env: Env): boolean {
  return Boolean(
    env.POSTCARD_TREASURY_PRIVATE_KEY &&
      env.NIMIQ_RPC_URL &&
      env.POSTCARD_TREASURY_ADDRESS,
  )
}

export async function sendTreasuryPayout(
  env: Env,
  recipientAddress: string,
  amountLuna: string,
): Promise<string> {
  const pkHex = env.POSTCARD_TREASURY_PRIVATE_KEY
  const rpcUrl = env.NIMIQ_RPC_URL

  if (!pkHex || !rpcUrl) {
    throw new Error('treasury payout not configured')
  }

  await ensureWasm()

  const cleanedKey = pkHex.replace(/\s/g, '')
  const privateKey = PrivateKey.fromHex(cleanedKey)
  const keyPair = KeyPair.derive(privateKey)
  const sender = keyPair.toAddress()
  const recipient = Address.fromUserFriendlyAddress(recipientAddress.trim())

  const height = await nimiqBlockHeight(rpcUrl)
  const networkId = Number(env.NIMIQ_NETWORK_ID ?? '24')
  const value = BigInt(amountLuna)
  const fee = BigInt(0)

  const tx = TransactionBuilder.newBasic(
    sender,
    recipient,
    value,
    fee,
    height,
    networkId,
  )
  keyPair.signTransaction(tx)

  const rawHex = tx.toHex()
  const hash = await nimiqRpc(rpcUrl, 'sendRawTransaction', [rawHex]) as string
  return hash
}
