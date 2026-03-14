CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  couple_names TEXT NOT NULL,
  wedding_date TEXT,
  plan TEXT DEFAULT 'free',
  storage_used INTEGER DEFAULT 0,
  storage_limit INTEGER DEFAULT 5368709120,
  wa_phone_id TEXT,
  wa_token TEXT,
  admin_pin_hash TEXT NOT NULL,
  theme TEXT DEFAULT 'classic',
  active INTEGER DEFAULT 1,
  data_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  events TEXT DEFAULT '[]',
  can_upload INTEGER DEFAULT 1,
  rsvp_status TEXT DEFAULT 'pending',
  checked_in INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workspace_id, phone)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  sender_name TEXT,
  sender_phone TEXT,
  event_tag TEXT,
  r2_key_pending TEXT,
  r2_key_final TEXT,
  media_type TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  received_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_workspace
  ON submissions(workspace_id, status);

CREATE TABLE IF NOT EXISTS access_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  phone TEXT,
  guest_name TEXT,
  action TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
