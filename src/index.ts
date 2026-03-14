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

// Auth — login
app.post('/auth/login', async (c) => {
  const { workspaceId, pin } = await c.req.json<{ workspaceId: string; pin: string }>()

  if (!workspaceId || !pin) {
    return c.json({ error: 'Missing workspaceId or pin' }, 400)
  }

  const workspace = await c.env.DB.prepare(
    'SELECT id, couple_names, plan, admin_pin_hash FROM workspaces WHERE id = ? AND active = 1'
  ).bind(workspaceId.trim()).first<{
    id: string
    couple_names: string
    plan: string
    admin_pin_hash: string
  }>()

  if (!workspace || workspace.admin_pin_hash !== pin.trim()) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // Simple JWT stub — replace with real signing in Phase 2
  const payload = {
    sub: workspace.id,
    name: workspace.couple_names,
    plan: workspace.plan,
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

export default app
