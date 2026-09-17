import type { Env } from './env'
import { normalizeAddress } from './db'
import { nimiqRpc } from './nimiqRpc'

interface NimiqTx {
  to?: string
  toAddress?: string
  value?: number | string
}

export class TxVerifyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TxVerifyError'
  }
}

function txRecipient(tx: NimiqTx): string | null {
  const addr = tx.toAddress ?? tx.to
  if (!addr || typeof addr !== 'string') return null
  return normalizeAddress(addr)
}

function txValueLuna(tx: NimiqTx): string | null {
  if (tx.value === undefined || tx.value === null) return null
  const n = typeof tx.value === 'number' ? tx.value : Number(tx.value)
  if (!Number.isFinite(n) || n <= 0) return null
  return String(Math.floor(n))
}

export async function verifyTx(
  env: Env,
  opts: {
    txHash: string
    toAddress: string
    amountLuna: string
  },
): Promise<void> {
  const rpcUrl = env.NIMIQ_RPC_URL?.trim()
  if (!rpcUrl) throw new TxVerifyError('nimiq rpc not configured')

  let tx: unknown
  try {
    tx = await nimiqRpc(rpcUrl, 'getTransactionByHash', [opts.txHash])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'tx lookup failed'
    if (msg.toLowerCase().includes('not found')) {
      throw new TxVerifyError('transaction not found')
    }
    throw new TxVerifyError(`tx lookup failed: ${msg}`)
  }

  if (!tx || typeof tx !== 'object') {
    throw new TxVerifyError('transaction not found')
  }

  const row = tx as NimiqTx
  const expectedTo = normalizeAddress(opts.toAddress)
  const recipient = txRecipient(row)
  if (!recipient || recipient !== expectedTo) {
    throw new TxVerifyError('transaction recipient mismatch')
  }

  const valueLuna = txValueLuna(row)
  if (!valueLuna || valueLuna !== opts.amountLuna.trim()) {
    throw new TxVerifyError('transaction amount mismatch')
  }
}

export function txVerifyStatus(err: unknown): number {
  if (!(err instanceof TxVerifyError)) return 502
  const msg = err.message
  if (msg === 'nimiq rpc not configured') return 503
  if (msg.startsWith('tx lookup failed')) return 502
  return 400
}
