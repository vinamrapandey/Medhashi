import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  DB: D1Database
  R2_BUCKET: R2Bucket
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Medhashi API',
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
    'SELECT id, couple_names, plan, admin_pin_hash, guest_pin FROM workspaces WHERE id = ? AND active = 1'
  ).bind(workspaceId.trim()).first<{
    id: string
    couple_names: string
    plan: string
    admin_pin_hash: string
    guest_pin: string
  }>()

  if (!workspace) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const trimmedPin = pin.trim()
  let isAdmin = false

  if (trimmedPin === workspace.admin_pin_hash) {
    isAdmin = true
  } else if (trimmedPin === workspace.guest_pin) {
    isAdmin = false
  } else {
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
    plan: workspace.plan
  })
})

// Stats — quick dashboard counts
app.get('/api/stats', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const workspaceId = 'medhashi-aands-2026' // hardcoded for stub

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
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const workspaceId = 'medhashi-aands-2026'
  const status = c.req.query('status') || 'pending'

  const rows = await c.env.DB.prepare(
    'SELECT * FROM submissions WHERE workspace_id = ? AND status = ? ORDER BY received_at DESC LIMIT 50'
  ).bind(workspaceId, status).all()

  return c.json({ submissions: rows.results })
})

// Guests — list
app.get('/api/guests', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const workspaceId = 'medhashi-aands-2026'

  const rows = await c.env.DB.prepare(
    'SELECT * FROM guests WHERE workspace_id = ? ORDER BY name ASC'
  ).bind(workspaceId).all()

  return c.json({ guests: rows.results })
})

// R2 public base URL
const R2_PUBLIC_BASE = 'https://pub-69d4a3d0d61d46359694bda9c1abfaf9.r2.dev'

// Helper: extract workspace ID from token
function getWorkspaceId(auth: string | undefined): string | null {
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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

  const publicUrl = `${R2_PUBLIC_BASE}/${r2Key}`
  return c.json({ success: true, id, url: publicUrl })
})

// Gallery — list approved photos
app.get('/api/gallery', async (c) => {
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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

  const photos = rows.results.map((row: any) => ({
    id: row.id,
    url: `${R2_PUBLIC_BASE}/${row.r2_key_final}`,
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { config } = await c.req.json<{ config: any }>()

  await c.env.DB.prepare(
    'UPDATE workspaces SET config = ? WHERE id = ?'
  ).bind(JSON.stringify(config), workspaceId).run()

  return c.json({ success: true })
})

// Workspace public config — NO auth required
app.get('/api/workspace/public', async (c) => {
  const wsId = c.req.query('id') || 'medhashi-aands-2026'

  const row = await c.env.DB.prepare(
    'SELECT config FROM workspaces WHERE id = ? AND active = 1'
  ).bind(wsId).first<{ config: string }>()

  if (!row) return c.json({ error: 'Not found' }, 404)

  let config = {}
  try { config = JSON.parse(row.config || '{}') } catch {}

  return c.json({ config })
})

// Submissions — approve/reject/reset
app.post('/api/submissions/:id/:action', async (c) => {
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id } = c.req.param()

  const row = await c.env.DB.prepare(
    'SELECT r2_key_pending, r2_key_final FROM submissions WHERE id = ? AND workspace_id = ?'
  ).bind(id, workspaceId).first<{ r2_key_pending: string; r2_key_final: string }>()

  if (!row) return c.json({ error: 'Not found' }, 404)

  const key = row.r2_key_final || row.r2_key_pending
  if (!key) return c.json({ error: 'No media' }, 404)

  return c.json({ url: `${R2_PUBLIC_BASE}/${key}` })
})

// Guests — CRUD
app.post('/api/guests', async (c) => {
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
  if (!workspaceId) return c.json({ error: 'Unauthorized' }, 401)

  const { id } = c.req.param()

  await c.env.DB.prepare(
    'DELETE FROM guests WHERE id = ? AND workspace_id = ?'
  ).bind(id, workspaceId).run()

  return c.json({ success: true })
})

app.post('/api/guests/import', async (c) => {
  const auth = c.req.header('Authorization')
  const workspaceId = getWorkspaceId(auth)
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

export default app
