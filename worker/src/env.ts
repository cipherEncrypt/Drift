export interface Env {
  DB?: D1Database
  drift_db?: D1Database
}

export function getDb(env: Env): D1Database {
  const db = env.DB ?? env.drift_db
  if (!db) {
    throw new Error('database binding missing on worker')
  }
  return db
}
