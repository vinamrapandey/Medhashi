CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    couple_names TEXT,
    wedding_date TEXT,
    plan TEXT,
    storage_used INTEGER DEFAULT 0,
    storage_limit INTEGER,
    admin_pin_hash TEXT,
    active INTEGER DEFAULT 1,
    data_deleted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    name TEXT,
    phone TEXT,
    events TEXT,
    can_upload INTEGER DEFAULT 1,
    rsvp_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_guests_workspace_id ON guests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    sender_name TEXT,
    sender_phone TEXT,
    event_tag TEXT,
    r2_key_pending TEXT,
    r2_key_final TEXT,
    media_type TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_workspace_status ON submissions(workspace_id, status);

CREATE TABLE IF NOT EXISTS access_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    phone TEXT,
    guest_name TEXT,
    action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_access_logs_workspace_id ON access_logs(workspace_id);
