CREATE TABLE IF NOT EXISTS profiles (
  address TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  rename_used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
