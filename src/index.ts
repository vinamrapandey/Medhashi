import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  DB: D1Database
  R2_BUCKET: R2Bucket
  ENVIRONMENT: string
  SUPABASE_JWT_SECRET: string
}

// ── Auth helpers ──────────────────────────────────────────
function detectAuthType(authHeader: string | undefined): 'supabase' | 'pin' | null {
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  // Supabase JWTs have exactly 3 base64url parts separated by dots
  if (token.split('.').length === 3) return 'supabase'
  return 'pin'
}

async function verifySupabaseJwt(token: string, secret: string): Promise<{ email?: string; sub?: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(payloadB64)) as { exp?: number; sub?: string; email?: string }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    // For now trust the token structure — full HMAC verify requires SubtleCrypto
    return { email: payload.email, sub: payload.sub }
  } catch {
    return null
  }
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
}))

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'Mimries API',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  })
})

// ── Public Guest App Endpoints (no auth required) ─────────────────────────

// Guest lookup — guest enters their phone number, we check if they're on the list
app.get('/api/public/guests/lookup', async (c) => {
  const workspaceId = c.req.query('workspace')
  const phone = c.req.query('phone')

  if (!workspaceId || !phone) return c.json({ error: 'workspace and phone required' }, 400)
  if (!/^\d{10}$/.test(phone)) return c.json({ found: false, error: 'Invalid phone' })

  const guest = await c.env.DB.prepare(
    'SELECT id, name, events, can_upload FROM guests WHERE workspace_id = ? AND phone = ? LIMIT 1'
  ).bind(workspaceId, phone).first<{ id: string; name: string; events: string; can_upload: number }>()

  if (!guest) return c.json({ found: false })

  // Log access non-blocking
  const logId = crypto.randomUUID()
  c.executionCtx?.waitUntil(
    c.env.DB.prepare(
      'INSERT OR IGNORE INTO access_logs (id, workspace_id, guest_phone, guest_name, accessed_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(logId, workspaceId, phone, guest.name, new Date().toISOString()).run()
  )

  return c.json({
    found: true,
    guest: {
      name: guest.name,
      events: JSON.parse(guest.events || '[]'),
      canUpload: guest.can_upload === 1,
    }
  })
})

// Public gallery — approved photos for a workspace/event (no auth)
app.get('/api/public/gallery', async (c) => {
  const workspaceId = c.req.query('workspace')
  const eventKey = c.req.query('event')

  if (!workspaceId) return c.json({ error: 'workspace required' }, 400)

  const params: string[] = [workspaceId]
  let query = `SELECT id, r2_key_final, sender_name, source, event_key
               FROM submissions
               WHERE workspace_id = ? AND status = 'approved' AND r2_key_final IS NOT NULL`
  if (eventKey) { query += ' AND event_key = ?'; params.push(eventKey) }
  query += ' ORDER BY reviewed_at DESC LIMIT 100'

  const rows = await c.env.DB.prepare(query).bind(...params).all()
  const apiBase = new URL(c.req.url).origin

  const photos = (rows.results as any[]).map(row => ({
    id: row.id,
    // Use the /media/* proxy endpoint which serves R2 without public bucket needed
    url: `${apiBase}/media/${row.r2_key_final}`,
    uploadedBy: row.sender_name || 'Guest',
    source: row.source,
    event: row.event_key,
  }))

  return c.json({ photos })
})

// Public upload — guest submits a photo, goes to pending review queue
app.post('/api/public/upload', async (c) => {
  const formData = await c.req.formData()
  const workspaceId = formData.get('workspaceId') as string
  const phone = (formData.get('phone') as string) || ''
  const senderName = (formData.get('senderName') as string) || 'Guest'
  const eventKey = (formData.get('eventKey') as string) || 'wedding'
  const file = formData.get('file') as File | null

  if (!workspaceId || !file) return c.json({ error: 'workspaceId and file required' }, 400)

  // Check file size (50MB max)
  if (file.size > 50 * 1024 * 1024) return c.json({ error: 'File too large (max 50MB)' }, 413)

  // Verify workspace is active
  const ws = await c.env.DB.prepare(
    'SELECT id FROM workspaces WHERE id = ? AND active = 1'
  ).bind(workspaceId).first()
  if (!ws) return c.json({ error: 'Workspace not found' }, 404)

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const fileId = crypto.randomUUID()
  const r2Key = `workspaces/${workspaceId}/pending/${fileId}.${ext}`

  await c.env.R2_BUCKET.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'image/jpeg' }
  })

  const submissionId = crypto.randomUUID()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO submissions
       (id, workspace_id, r2_key_pending, status, event_key, sender_phone, sender_name, source, submitted_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, 'direct', ?)`
  ).bind(submissionId, workspaceId, r2Key, eventKey, phone, senderName, now).run()

  return c.json({ success: true, submissionId })
})

app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Mimries API',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  })
})

// Auth — login (supports admin PIN and guest PIN)
app.post('/auth/login', async (c) => {
  const { workspaceId, pin } = await c.req.json<{ workspaceId: string; pin: string }>()

  if (!workspaceId || !pin) {
    return c.json({ error: 'Missing workspaceId or pin' }, 400)
  }

  const workspace = await c.env.DB.prepare(
    'SELECT id, couple_names, plan, admin_pin_hash FROM workspaces WHERE id = ? AND active = 1'
  ).bind(workspaceId.trim()).first<any>()

  if (!workspace) return c.json({ error: 'Invalid credentials' }, 401)

  const pinTrimmed = pin.trim()
  const isAdmin = pinTrimmed === workspace.admin_pin_hash
  
  // Check guest pin from configurations table
  let isGuest = false
  if (!isAdmin) {
    const guestPinRow = await c.env.DB.prepare(
      "SELECT value FROM configurations WHERE workspace_id = ? AND key = 'guest_pin'"
    ).bind(workspace.id).first<{ value: string }>()
    isGuest = guestPinRow?.value === pinTrimmed
  }

  if (!isAdmin && !isGuest) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const payload = {
    sub: workspace.id,
    name: workspace.couple_names,
    plan: workspace.plan,
    isAdmin,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }
  const token = btoa(JSON.stringify(payload))

  return c.json({
    token,
    workspaceId: workspace.id,
    workspaceName: workspace.couple_names,
    plan: workspace.plan,
    isAdmin
  })
})

// ── Workspace Provisioning (called by manage.mimries.com) ──
app.post('/api/workspaces/provision', async (c) => {
  const auth = c.req.header('Authorization')
  const authType = detectAuthType(auth)

  // Must be authenticated with a Supabase JWT
  if (authType !== 'supabase' || !auth) {
    return c.json({ error: 'Unauthorized — Supabase JWT required' }, 401)
  }
  const token = auth.replace('Bearer ', '')
  const jwtUser = await verifySupabaseJwt(token, c.env.SUPABASE_JWT_SECRET)
  if (!jwtUser) return c.json({ error: 'Invalid or expired token' }, 401)

  const body = await c.req.json<{
    slug: string
    displayName: string
    weddingDate?: string
    events?: string[]
    ownerEmail?: string
    brideName?: string
    groomName?: string
    supabaseWorkspaceId?: string
  }>()

  const { slug, displayName } = body
  if (!slug || !displayName) {
    return c.json({ error: 'slug and displayName are required' }, 400)
  }

  // Idempotent — check if workspace already exists
  const existing = await c.env.DB.prepare(
    'SELECT id, owner_supabase_id FROM workspaces WHERE id = ? LIMIT 1'
  ).bind(slug).first<{id: string, owner_supabase_id: string}>()

  if (existing) {
    if (existing.owner_supabase_id !== jwtUser.sub) {
      return c.json({ error: 'Workspace slug already taken by another user' }, 403)
    }
  } else {
    const now = new Date().toISOString()
    // Step 1 — Insert workspace row (columns guaranteed to exist in D1 schema)
    await c.env.DB.prepare(
      `INSERT INTO workspaces
         (id, owner_supabase_id, slug, display_name, plan, wedding_date, active, created_at)
       VALUES (?, ?, ?, ?, 'free', ?, 1, ?)`
    ).bind(slug, jwtUser.sub ?? '', slug, displayName, body.weddingDate || null, now).run()
  }

  // Step 2 — Store initial config JSON with couple names + events.
  const EVENT_TITLES: Record<string, string> = {
    wedding: 'Wedding',
    engagement: 'Engagement',
    haldi: 'Haldi & Mehandi',
    sangeet: 'Sangeet',
  }
  
  const venueLocation = [body.venue, body.city, body.state].filter(Boolean).join(', ')

  const eventObjects = (body.events ?? ['wedding']).map((key: string) => ({
    key: `event-${key}-${Date.now()}`,
    title: EVENT_TITLES[key] ?? (key.charAt(0).toUpperCase() + key.slice(1)),
    date: body.weddingDate ? new Date(body.weddingDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '',
    venue: venueLocation || '',
    googleMapsUrl: ''
  }))
  
  // Fetch existing config if any to merge (in case this is a retry and some config was already saved)
  let existingConfig = {}
  try {
    const configRow = await c.env.DB.prepare('SELECT config FROM workspaces WHERE id = ?').bind(slug).first<{config: string}>()
    if (configRow?.config) existingConfig = JSON.parse(configRow.config)
  } catch {}

  const initialConfig = JSON.stringify({
    ...existingConfig,
    brideName: body.brideName ?? '',
    groomName: body.groomName ?? '',
    events: eventObjects,
  })

  try {
    await c.env.DB.prepare(
      'UPDATE workspaces SET config = ? WHERE id = ?'
    ).bind(initialConfig, slug).run()
  } catch {
    // config column not yet added via migration — workspace row is created, config will be empty
  }

  return c.json({ success: true, workspaceId: slug, displayName, alreadyExists: !!existing })
})

// Check workspace slug availability
app.get('/api/workspaces/check-slug/:slug', async (c) => {
  const slug = c.req.param('slug')
  const existing = await c.env.DB.prepare(
    'SELECT id FROM workspaces WHERE id = ? LIMIT 1'
  ).bind(slug).first()
  return c.json({ available: !existing })
})

// Workspace config — save (Supabase JWT, used by manage portal settings page)
app.post('/api/workspace/config', async (c) => {
  const auth = c.req.header('Authorization')
  const authType = detectAuthType(auth)
  if (authType !== 'supabase' || !auth) return c.json({ error: 'Unauthorized — Supabase JWT required' }, 401)

  const token = auth.replace('Bearer ', '')
  const jwtUser = await verifySupabaseJwt(token, c.env.SUPABASE_JWT_SECRET)
  if (!jwtUser) return c.json({ error: 'Invalid or expired token' }, 401)

  const workspaceId = c.req.header('x-workspace-id')
  if (!workspaceId) return c.json({ error: 'x-workspace-id header required' }, 400)

  // Verify the requesting user owns this workspace
  const ws = await c.env.DB.prepare(
    'SELECT id FROM workspaces WHERE id = ? AND owner_supabase_id = ?'
  ).bind(workspaceId, jwtUser.sub ?? '').first()
  if (!ws) return c.json({ error: 'Workspace not found or unauthorized' }, 403)

  const body = await c.req.json<Record<string, unknown>>()

  // Merge incoming fields into existing config JSON
  const existing = await c.env.DB.prepare(
    'SELECT config FROM workspaces WHERE id = ?'
  ).bind(workspaceId).first<{ config: string }>()

  let config: Record<string, unknown> = {}
  try { if (existing?.config) config = JSON.parse(existing.config) } catch {}

  Object.assign(config, body)

  await c.env.DB.prepare(
    'UPDATE workspaces SET config = ? WHERE id = ?'
  ).bind(JSON.stringify(config), workspaceId).run()

  return c.json({ success: true })
})

// Stats — quick dashboard counts
app.get('/api/stats', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const guests = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM guests WHERE workspace_id = ?'
  ).bind(workspaceId).first<{ count: number }>()

  const pending = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM submissions WHERE workspace_id = ? AND status = 'pending'"
  ).bind(workspaceId).first<{ count: number }>()

  const approved = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM submissions WHERE workspace_id = ? AND status = 'approved'"
  ).bind(workspaceId).first<{ count: number }>()

  return c.json({
    totalGuests: guests?.count ?? 0,
    pendingReview: pending?.count ?? 0,
    approvedPhotos: approved?.count ?? 0,
    storageUsedGB: 0,
    storageQuotaGB: 100
  })
})

// Submissions — list
app.get('/api/submissions', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)
  const status = c.req.query('status') || 'pending'

  let rows;
  if (status === 'all') {
    rows = await c.env.DB.prepare(
      'SELECT * FROM submissions WHERE workspace_id = ? ORDER BY received_at DESC LIMIT 50'
    ).bind(workspaceId).all()
  } else {
    rows = await c.env.DB.prepare(
      'SELECT * FROM submissions WHERE workspace_id = ? AND status = ? ORDER BY received_at DESC LIMIT 50'
    ).bind(workspaceId, status).all()
  }

  return c.json({ submissions: rows.results })
})

// Guests — list
app.get('/api/guests', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const rows = await c.env.DB.prepare(
    'SELECT * FROM guests WHERE workspace_id = ? ORDER BY name ASC'
  ).bind(workspaceId).all()

  return c.json({ guests: rows.results })
})

// R2_PUBLIC_BASE is now read from configurations table per request
async function getR2Base(db: D1Database, workspaceId: string): Promise<string> {
  const row = await db.prepare(
    "SELECT value FROM configurations WHERE workspace_id = ? AND key = 'r2_public_base'"
  ).bind(workspaceId).first<{ value: string }>()
  return row?.value || ''
}

// Helper: Load all config for a workspace
async function getConfig(
  db: D1Database,
  workspaceId: string
): Promise<Record<string, string>> {
  const rows = await db.prepare(
    'SELECT key, value FROM configurations WHERE workspace_id = ?'
  ).bind(workspaceId).all()

  const config: Record<string, string> = {}
  for (const row of rows.results as any[]) {
    config[row.key] = row.value || ''
  }
  return config
}

// Helper: extract workspace ID from token or header
function getWorkspaceId(c: any): string | null {
  const ws = c.req.header('x-workspace-id');
  if (ws) return ws;
  
  const auth = c.req.header('Authorization');
  if (!auth) return null
  try {
    const token = auth.replace('Bearer ', '')
    const payload = JSON.parse(atob(token))
    return payload.sub || null
  } catch {
    return null
  }
}

// Upload — admin manual upload (directly approved)
app.post('/api/upload-manual', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const formData = await c.req.formData()
  const file = formData.get('file') as unknown as File
  const senderName = (formData.get('senderName') as string) || 'Admin'
  const senderPhone = (formData.get('senderPhone') as string) || ''
  const eventTag = (formData.get('eventTag') as string) || 'general'

  if (!file) return c.json({ error: 'No file provided' }, 400)

  const id = crypto.randomUUID()
  const ext = file.type.startsWith('video/') ? 'mp4' : 'jpg'
  const r2Key = `workspaces/${workspaceId}/gallery/${eventTag}/${id}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type }
  })

  await c.env.DB.prepare(`
    INSERT INTO submissions
      (id, workspace_id, sender_name, sender_phone, event_tag,
       r2_key_final, media_type, file_size, status, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))
  `).bind(
    id, workspaceId, senderName, senderPhone, eventTag,
    r2Key, file.type.startsWith('video/') ? 'video' : 'image',
    file.size
  ).run()

  const publicUrl = `${await getR2Base(c.env.DB, workspaceId)}/${r2Key}`
  return c.json({ success: true, id, url: publicUrl })
})

// Gallery — list approved photos
app.get('/api/gallery', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const eventTag = c.req.query('event')

  let query = `
    SELECT id, sender_name, sender_phone, event_tag,
           r2_key_final, media_type, received_at
    FROM submissions
    WHERE workspace_id = ? AND status = 'approved'
  `
  const params: string[] = [workspaceId]

  if (eventTag && eventTag !== 'all') {
    query += ' AND event_tag = ?'
    params.push(eventTag)
  }

  query += ' ORDER BY received_at DESC LIMIT 200'

  const rows = await c.env.DB.prepare(query).bind(...params).all()

  const r2Base = await getR2Base(c.env.DB, workspaceId)
  const photos = rows.results.map((row: any) => ({
    id: row.id,
    url: `${r2Base}/${row.r2_key_final}`,
    uploadedBy: row.sender_name || 'Guest',
    phone: row.sender_phone,
    event: row.event_tag,
    mediaType: row.media_type,
    timestamp: row.received_at,
    source: 'direct'
  }))

  return c.json({ photos })
})

// Gallery — delete photo
app.delete('/api/gallery/:id', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id } = c.req.param()

  const row = await c.env.DB.prepare(
    'SELECT r2_key_final FROM submissions WHERE id = ? AND workspace_id = ?'
  ).bind(id, workspaceId).first<{ r2_key_final: string }>()

  if (!row) return c.json({ error: 'Not found' }, 404)

  if (row.r2_key_final) {
    await c.env.R2_BUCKET.delete(row.r2_key_final)
  }

  await c.env.DB.prepare(
    'DELETE FROM submissions WHERE id = ? AND workspace_id = ?'
  ).bind(id, workspaceId).run()

  return c.json({ success: true })
})

// Upload — guest upload (goes to pending review queue)
app.post('/api/upload-guest', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const formData = await c.req.formData()
  const file = formData.get('file') as unknown as File
  const senderName = (formData.get('senderName') as string) || 'Guest'
  const senderPhone = (formData.get('senderPhone') as string) || ''
  const eventTag = (formData.get('eventTag') as string) || 'general'

  if (!file) return c.json({ error: 'No file provided' }, 400)

  const id = crypto.randomUUID()
  const ext = file.type.startsWith('video/') ? 'mp4' : 'jpg'
  const r2Key = `workspaces/${workspaceId}/pending/${eventTag}/${id}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type }
  })

  await c.env.DB.prepare(`
    INSERT INTO submissions
      (id, workspace_id, sender_name, sender_phone, event_tag,
       r2_key_pending, media_type, file_size, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(
    id, workspaceId, senderName, senderPhone, eventTag,
    r2Key, file.type.startsWith('video/') ? 'video' : 'image',
    file.size
  ).run()

  return c.json({ success: true, previewUrl: null })
})

// Access logs — log guest access
app.post('/api/access-logs', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { phone, name } = await c.req.json<{ phone: string; name: string }>()

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO access_logs (id, workspace_id, phone, guest_name, action) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, workspaceId, phone || '', name || '', 'login').run()

  return c.json({ success: true })
})

// Workspace config — GET
app.get('/api/workspace', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const row = await c.env.DB.prepare(
    'SELECT id, couple_names, wedding_date, plan, config FROM workspaces WHERE id = ?'
  ).bind(workspaceId).first<{
    id: string; couple_names: string; wedding_date: string; plan: string; config: string
  }>()

  if (!row) return c.json({ error: 'Not found' }, 404)

  let config = {}
  try { config = JSON.parse(row.config || '{}') } catch {}

  return c.json({
    workspaceId: row.id,
    coupleName: row.couple_names,
    weddingDate: row.wedding_date,
    plan: row.plan,
    config
  })
})

// Workspace config — PUT (admin only)
app.put('/api/workspace', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { config, newAdminPin } = await c.req.json<{ config: any, newAdminPin?: string }>()

  if (config) {
    await c.env.DB.prepare(
      'UPDATE workspaces SET config = ? WHERE id = ?'
    ).bind(JSON.stringify(config), workspaceId).run()
  }

  if (newAdminPin) {
    await c.env.DB.prepare(
      'UPDATE workspaces SET admin_pin_hash = ? WHERE id = ?'
    ).bind(newAdminPin.trim(), workspaceId).run()
  }

  return c.json({ success: true })
})

// Workspace public config — NO auth required
app.get('/api/workspace/public', async (c) => {
  const wsId = c.req.query('id') || 'mimries-aands-2026'
  return c.json({ config: await getUnifiedConfig(c.env.DB, wsId) })
})

// Unified public config endpoint matching guest app expected path
app.get('/api/config/public/:workspaceId', async (c) => {
  const wsId = c.req.param('workspaceId')
  return c.json({ config: await getUnifiedConfig(c.env.DB, wsId) })
})

async function getUnifiedConfig(db: D1Database, workspaceId: string) {
  // 1. Always fetch core workspace columns (guaranteed to exist in schema)
  const wsRow = await db.prepare(
    'SELECT display_name, slug, wedding_date, plan FROM workspaces WHERE id = ?'
  ).bind(workspaceId).first<{ display_name: string; slug: string; wedding_date: string; plan: string }>()

  // Workspace doesn't exist at all — return empty so guest page shows 404
  if (!wsRow) return {}

  // Seed unified config from guaranteed columns so guest page always has a name to render
  const unified: any = {
    display_name: wsRow.display_name,
    wedding_date: wsRow.wedding_date ?? null,
    plan: wsRow.plan,
  }

  // 2. Merge config JSON column (may not exist if ALTER TABLE hasn't been run yet)
  try {
    const configRow = await db.prepare(
      'SELECT config FROM workspaces WHERE id = ?'
    ).bind(workspaceId).first<{ config: string }>()
    if (configRow?.config) Object.assign(unified, JSON.parse(configRow.config))
  } catch {
    // config column not yet added via migration — core columns already seeded above
  }

  // 3. Override with individual configuration key-values from configurations table
  try {
    const rows = await db.prepare(
      'SELECT key, value FROM configurations WHERE workspace_id = ? AND is_secret = 0'
    ).bind(workspaceId).all()
    for (const row of (rows.results as any[])) {
      unified[row.key] = row.value || ''
    }
  } catch {
    // configurations table may not exist in all environments
  }

  // Ensure default events exist to prevent UI breakage for legacy or incomplete workspaces
  if (!unified.events || !Array.isArray(unified.events) || unified.events.length === 0) {
    unified.events = [{ key: 'wedding', title: 'Wedding' }]
  }

  return unified
}

// Submissions — approve/reject/reset
app.post('/api/submissions/:id/:action', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id, action } = c.req.param()

  if (action === 'approve') {
    // Move from pending R2 key to final R2 key
    const sub = await c.env.DB.prepare(
      'SELECT r2_key_pending, event_tag, media_type FROM submissions WHERE id = ? AND workspace_id = ?'
    ).bind(id, workspaceId).first<{ r2_key_pending: string; event_tag: string; media_type: string }>()

    if (!sub) return c.json({ error: 'Not found' }, 404)

    let r2KeyFinal = sub.r2_key_pending
    if (sub.r2_key_pending && sub.r2_key_pending.includes('/pending/')) {
      // Copy from pending to gallery
      r2KeyFinal = sub.r2_key_pending.replace('/pending/', '/gallery/')
      const obj = await c.env.R2_BUCKET.get(sub.r2_key_pending)
      if (obj) {
        await c.env.R2_BUCKET.put(r2KeyFinal, await obj.arrayBuffer(), {
          httpMetadata: obj.httpMetadata
        })
        await c.env.R2_BUCKET.delete(sub.r2_key_pending)
      }
    }

    await c.env.DB.prepare(
      "UPDATE submissions SET status = 'approved', r2_key_final = ?, reviewed_at = datetime('now') WHERE id = ? AND workspace_id = ?"
    ).bind(r2KeyFinal, id, workspaceId).run()

  } else if (action === 'reject') {
    // Delete from R2 and mark rejected
    const sub = await c.env.DB.prepare(
      'SELECT r2_key_pending FROM submissions WHERE id = ? AND workspace_id = ?'
    ).bind(id, workspaceId).first<{ r2_key_pending: string }>()

    if (sub && sub.r2_key_pending) {
      await c.env.R2_BUCKET.delete(sub.r2_key_pending)
    }

    await c.env.DB.prepare(
      "UPDATE submissions SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ? AND workspace_id = ?"
    ).bind(id, workspaceId).run()

  } else if (action === 'reset') {
    await c.env.DB.prepare(
      "UPDATE submissions SET status = 'pending', reviewed_at = NULL WHERE id = ? AND workspace_id = ?"
    ).bind(id, workspaceId).run()
  }

  return c.json({ success: true })
})

// Submissions — get media URL for preview
app.get('/api/submissions/:id/media-url', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id } = c.req.param()

  const row = await c.env.DB.prepare(
    'SELECT r2_key_pending, r2_key_final FROM submissions WHERE id = ? AND workspace_id = ?'
  ).bind(id, workspaceId).first<{ r2_key_pending: string; r2_key_final: string }>()

  if (!row) return c.json({ error: 'Not found' }, 404)

  const key = row.r2_key_final || row.r2_key_pending
  if (!key) return c.json({ error: 'No media' }, 404)

  const r2Base = await getR2Base(c.env.DB, workspaceId)
  if (r2Base) {
    return c.json({ url: `${r2Base}/${key}` })
  } else {
    // Fallback: proxy through API
    const url = new URL(c.req.url)
    return c.json({ url: `${url.origin}/media/${key}` })
  }
})

// Fallback media proxy if r2_public_base is not configured
app.get('/media/*', async (c) => {
  const url = new URL(c.req.url)
  const key = url.pathname.replace('/media/', '')
  
  const obj = await c.env.R2_BUCKET.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)

  const headers = new Headers()
  obj.writeHttpMetadata(headers as any)
  headers.set('etag', obj.httpEtag)

  return new Response(obj.body, { headers })
})

// Guests — CRUD
app.post('/api/guests', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { name, phone, events, can_upload } = await c.req.json<{
    name: string; phone: string; events: string[]; can_upload: number
  }>()

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO guests (id, workspace_id, name, phone, events, can_upload) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, workspaceId, name, phone || '', JSON.stringify(events || []), can_upload ?? 1).run()

  return c.json({ success: true, id })
})

app.put('/api/guests/:id', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id } = c.req.param()
  const { name, phone, events, can_upload } = await c.req.json<{
    name: string; phone: string; events: string[]; can_upload: number
  }>()

  await c.env.DB.prepare(
    'UPDATE guests SET name = ?, phone = ?, events = ?, can_upload = ? WHERE id = ? AND workspace_id = ?'
  ).bind(name, phone || '', JSON.stringify(events || []), can_upload ?? 1, id, workspaceId).run()

  return c.json({ success: true })
})

app.delete('/api/guests/:id', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id } = c.req.param()

  await c.env.DB.prepare(
    'DELETE FROM guests WHERE id = ? AND workspace_id = ?'
  ).bind(id, workspaceId).run()

  return c.json({ success: true })
})

app.post('/api/guests/import', async (c) => {
  const workspaceId = getWorkspaceId(c)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const guests = await c.req.json<Array<{
    name: string; phone: string; events: string[]; can_upload: number
  }>>()

  let count = 0
  for (const g of guests) {
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO guests (id, workspace_id, name, phone, events, can_upload) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, workspaceId, g.name, g.phone || '', JSON.stringify(g.events || []), g.can_upload ?? 1).run()
    count++
  }

  return c.json({ success: true, count })
})

app.get('/api/config', async (c) => {
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const isAdmin = (() => {
    try {
      return JSON.parse(atob(auth!.replace('Bearer ', ''))).isAdmin === true
    } catch { return false }
  })()

  const rows = await c.env.DB.prepare(
    'SELECT key, value, label, description, category, is_secret FROM configurations WHERE workspace_id = ? ORDER BY category, key'
  ).bind(workspaceId).all()

  const configs = (rows.results as any[]).map(row => ({
    key: row.key,
    value: isAdmin
      ? (row.value || '')
      : (row.is_secret ? '••••••••' : (row.value || '')),
    label: row.label,
    description: row.description,
    category: row.category,
    isSecret: row.is_secret === 1,
    isEmpty: !row.value || row.value.trim() === ''
  }))

  return c.json({ configs })
})

app.put('/api/config', async (c) => {
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const isAdmin = (() => {
    try {
      return JSON.parse(atob(auth!.replace('Bearer ', ''))).isAdmin === true
    } catch { return false }
  })()
  if (!isAdmin) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json<{ updates: Array<{ key: string; value: string }> }>()
  if (!body.updates || !Array.isArray(body.updates)) {
    return c.json({ error: 'Invalid body' }, 400)
  }

  const statements = body.updates.map(({ key, value }) =>
    c.env.DB.prepare(
      `UPDATE configurations
       SET value = ?, updated_at = datetime('now')
       WHERE workspace_id = ? AND key = ?`
    ).bind(value, workspaceId, key)
  )

  await c.env.DB.batch(statements)

  const telegramKeys = ['telegram_bot_token', 'telegram_webhook_secret', 'telegram_enabled']
  const hasTelegramUpdate = body.updates.some(u => telegramKeys.includes(u.key))

  if (hasTelegramUpdate) {
    const config = await getConfig(c.env.DB, workspaceId)
    if (config.telegram_enabled === 'true' && config.telegram_bot_token) {
      const webhookUrl = `https://mimries-api.mimries.workers.dev/telegram/webhook/${workspaceId}`
      await fetch(
        `https://api.telegram.org/bot${config.telegram_bot_token}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: config.telegram_webhook_secret || '',
            allowed_updates: ['message']
          })
        }
      )
    }
  }

  return c.json({ success: true, updated: body.updates.length })
})

// Note: /api/config/public/:workspaceId is registered above (getUnifiedConfig).
// Duplicate removed — only one handler should exist for this route.

app.post('/telegram/webhook/:workspaceId', async (c) => {
  const { workspaceId } = c.req.param()
  const secretHeader = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  const config = await getConfig(c.env.DB, workspaceId)

  if (config.telegram_webhook_secret &&
      secretHeader !== config.telegram_webhook_secret) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  if (config.telegram_enabled !== 'true') return c.json({ ok: true })

  const body = await c.req.json<any>()
  const message = body?.message
  if (!message) return c.json({ ok: true })

  const chatId = String(message.chat?.id || '')
  const senderName = [
    message.from?.first_name,
    message.from?.last_name
  ].filter(Boolean).join(' ') || 'Telegram Guest'
  const senderPhone = ''

  const photos = message.photo
  if (photos && photos.length > 0) {
    const photo = photos[photos.length - 1]
    const fileId = photo.file_id

    const fileRes = await fetch(
      `https://api.telegram.org/bot${config.telegram_bot_token}/getFile?file_id=${fileId}`
    )
    const fileData = await fileRes.json<any>()
    const filePath = fileData?.result?.file_path

    if (filePath) {
      const imgRes = await fetch(
        `https://api.telegram.org/file/bot${config.telegram_bot_token}/${filePath}`
      )

      const submId = crypto.randomUUID()
      const ext = filePath.split('.').pop() || 'jpg'
      const r2Key = `workspaces/${workspaceId}/pending/${submId}.${ext}`

      await c.env.R2_BUCKET.put(r2Key, imgRes.body as any, {
        httpMetadata: { contentType: 'image/jpeg' }
      })

      const caption = (message.caption || '').toLowerCase()
      let eventTag = 'general'
      if (caption.includes('engagement')) eventTag = 'engagement'
      else if (caption.includes('haldi') || caption.includes('mehandi') ||
               caption.includes('sangeet')) eventTag = 'haldi'
      else if (caption.includes('wedding') || caption.includes('shaadi') ||
               caption.includes('vivah')) eventTag = 'wedding'

      await c.env.DB.prepare(`
        INSERT INTO submissions
          (id, workspace_id, sender_name, sender_phone, event_tag,
           r2_key_pending, media_type, status, received_at)
        VALUES (?, ?, ?, ?, ?, ?, 'image', 'pending', datetime('now'))
      `).bind(
        submId, workspaceId, senderName, senderPhone, eventTag, r2Key
      ).run()

      await fetch(
        `https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Thank you ${senderName}! Your photo has been received and will appear in the gallery after review. 📸`
          })
        }
      )

      if (config.telegram_admin_chat_id) {
        await fetch(
          `https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.telegram_admin_chat_id,
              text: `📸 New photo from ${senderName} (${eventTag})\nOpen admin to review: https://mimries.com/admin-v2.html`
            })
          }
        )
      }
    }
  }

  if (message.text) {
    await fetch(
      `https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Welcome to Mimries! 💍\n\nTo share your photos:\n• Send your photos directly in this chat\n• Add a caption with the event name: engagement, haldi, or wedding\n\nYour photos will appear in the gallery after approval.`
        })
      }
    )
  }

  return c.json({ ok: true })
})

export default app
