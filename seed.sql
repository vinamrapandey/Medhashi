  INSERT OR IGNORE INTO configurations
    (id, workspace_id, key, value, label, description, category, is_secret)
  VALUES
    (lower(hex(randomblob(16))), 'medhashi-aands-2026',
     'guest_direct_upload_enabled', 'false',
     'Allow Guest Direct Upload',
     'Show direct upload button on guest app event pages',
     'system', 0);

  INSERT OR IGNORE INTO configurations
    (id, workspace_id, key, value, label, description, category, is_secret)
  VALUES
    (lower(hex(randomblob(16))), 'medhashi-aands-2026',
     'workspace_display_name', 'Apoorva & Saumya',
     'Event Space Name',
     'Name shown in admin panel header',
     'system', 0);

  INSERT OR IGNORE INTO configurations
    (id, workspace_id, key, value, label, description, category, is_secret)
  VALUES
    (lower(hex(randomblob(16))), 'medhashi-aands-2026',
     'admin_language', 'en',
     'Admin Panel Language',
     'Language for admin dashboard interface',
     'system', 0);
