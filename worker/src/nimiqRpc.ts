export async function nimiqRpc(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })

  const text = await res.text()
  let data: { error?: { message?: string }; result?: unknown } = {}

  if (text) {
    try {
      data = JSON.parse(text) as { error?: { message?: string }; result?: unknown }
    } catch {
      throw new Error('nimiq rpc invalid response')
    }
  }

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `nimiq rpc failed (${res.status})`)
  }

  const result = data.result
  if (result && typeof result === 'object' && 'data' in result) {
    return (result as { data: unknown }).data
  }
  return result
}

export async function nimiqBlockHeight(rpcUrl: string): Promise<number> {
  for (const method of ['getBlockNumber', 'blockNumber'] as const) {
    try {
      const height = await nimiqRpc(rpcUrl, method, [])
      if (typeof height === 'number') return height
    } catch {
      // try legacy method name
    }
  }
  throw new Error('nimiq rpc block height unavailable')
}
