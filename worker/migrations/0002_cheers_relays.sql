CREATE TABLE IF NOT EXISTS cheers (
  id TEXT PRIMARY KEY,
  plane_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  amount_luna TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relays (
  id TEXT PRIMARY KEY,
  plane_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  amount_luna TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  time_saved_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cheers_plane_id ON cheers(plane_id);
CREATE INDEX IF NOT EXISTS idx_relays_plane_id ON relays(plane_id);
