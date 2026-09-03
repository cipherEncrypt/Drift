export interface Env {
  DB?: D1Database
  drift_db?: D1Database
  POSTCARD_TREASURY_PRIVATE_KEY?: string
  POSTCARD_TREASURY_ADDRESS?: string
  NIMIQ_RPC_URL?: string
  NIMIQ_NETWORK_ID?: string
}

export function getDb(env: Env): D1Database {
  const db = env.DB ?? env.drift_db
  if (!db) {
    throw new Error('database binding missing on worker')
  }
  return db
}
