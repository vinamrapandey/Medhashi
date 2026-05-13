CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_supabase_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  wedding_date TEXT,
  city TEXT,
  state TEXT,
  storage_used_bytes INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  data_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  events TEXT DEFAULT '[]',
  can_upload INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  guest_id TEXT REFERENCES guests(id),
  r2_key_pending TEXT,
  r2_key_final TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  event_key TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  source TEXT DEFAULT 'direct',
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT,
  venue TEXT,
  city TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS access_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  guest_phone TEXT,
  guest_name TEXT,
  accessed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS telegram_sessions (
  chat_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  sender_name TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
