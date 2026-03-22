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

  const publicUrl = `${await getR2Base(c.env.DB, workspaceId)}/${r2Key}`
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

  return c.json({ url: `${await getR2Base(c.env.DB, workspaceId)}/${key}` })
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
      const webhookUrl = `https://medhashi-api.medhashi.workers.dev/telegram/webhook/${workspaceId}`
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

app.get('/api/config/public/:workspaceId', async (c) => {
  const { workspaceId } = c.req.param()
  
  if (!workspaceId) return c.json({ error: 'Workspace ID required' }, 400)

  const rows = await c.env.DB.prepare(
    `SELECT key, value FROM configurations
     WHERE workspace_id = ? AND is_secret = 0`
  ).bind(workspaceId).all()

  const config: Record<string, string> = {}
  for (const row of rows.results as any[]) {
    config[(row as any).key] = (row as any).value || ''
  }

  return c.json({ config })
})

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
              text: `📸 New photo from ${senderName} (${eventTag})\nOpen admin to review: https://medhashi.com/admin-v2.html`
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
          text: `Welcome to Medhashi! 💍\n\nTo share your photos:\n• Send your photos directly in this chat\n• Add a caption with the event name: engagement, haldi, or wedding\n\nYour photos will appear in the gallery after approval.`
        })
      }
    )
  }

  return c.json({ ok: true })
})

export default app
