CREATE TABLE IF NOT EXISTS planes (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  amount_luna TEXT NOT NULL,
  note TEXT,
  tx_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  launched_at TEXT NOT NULL,
  arrives_at TEXT NOT NULL,
  from_lat REAL NOT NULL,
  from_lng REAL NOT NULL,
  to_lat REAL,
  to_lng REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  plane_id TEXT NOT NULL,
  claimant_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  public_key TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_planes_to_address ON planes(to_address);
CREATE INDEX IF NOT EXISTS idx_planes_status_arrives ON planes(status, arrives_at);
CREATE INDEX IF NOT EXISTS idx_claims_plane_id ON claims(plane_id);
