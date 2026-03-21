/* ============================================
   MEDHASHI — API Database Layer
   Connects to Cloudflare Workers API
   ============================================ */

const API_BASE = 'https://medhashi-api.medhashi.workers.dev'

/* ---- Token Management ---- */
async function getGuestToken() {
  let token = sessionStorage.getItem('medhashi_guest_token')
  if (token) return token
  try {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'medhashi-aands-2026',
        pin: 'guest2026'
      })
    })
    const data = await res.json()
    token = data.token
    sessionStorage.setItem('medhashi_guest_token', token)
    return token
  } catch {
    return null
  }
}

async function guestApi(path) {
  const token = await getGuestToken()
  const res = await fetch(API_BASE + path, {
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

/* ---- "Database" initialization ---- */
let db = true
let storage = null

function initFirebase() {
  console.log('Medhashi API active.')
  getGuestToken().catch(() => {})
  return true
}

/* ==================== GUESTS ==================== */
async function lookupGuest(phone) {
  try {
    const data = await guestApi('/api/guests?search=' + phone)
    const guests = data.guests || []
    const guest = guests.find(g => g.phone === phone)
    if (guest) {
      return {
        name: guest.name,
        nameHindi: guest.name,
        phone: guest.phone,
        events: JSON.parse(guest.events || '[]'),
        canUpload: guest.can_upload === 1
      }
    }
  } catch {}
  // Wedding fallback — allow any guest
  return {
    name: 'Guest',
    nameHindi: 'अतिथि',
    phone,
    events: ['engagement', 'haldi', 'wedding'],
    canUpload: true
  }
}

function logGuestAccess(phone, name) {
  getGuestToken().then(token => {
    if (!token) return
    fetch(API_BASE + '/api/access-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ phone, name })
    }).catch(() => {})
  })
}

/* ==================== PHOTOS ==================== */
async function uploadPhoto(file, eventName, phone) {
  try {
    const token = await getGuestToken()
    if (!token) return null
    const formData = new FormData()
    formData.append('file', file)
    formData.append('senderPhone', phone)
    formData.append('senderName', sessionStorage.getItem('guest_name') || 'Guest')
    formData.append('eventTag', eventName)
    const res = await fetch(API_BASE + '/api/upload-guest', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    })
    const data = await res.json()
    return data.previewUrl || null
  } catch {
    return null
  }
}

async function getPhotos(eventName) {
  try {
    const data = await guestApi('/api/gallery?event=' + eventName)
    return (data.photos || []).map(p => ({
      id: p.id,
      url: p.url,
      uploadedBy: p.uploadedBy,
      source: p.source || 'direct',
      event: p.event,
      approved: true
    }))
  } catch {
    return []
  }
}

async function checkUploadPermission(phone) {
  try {
    const data = await guestApi('/api/guests?search=' + phone)
    const guests = data.guests || []
    const guest = guests.find(g => g.phone === phone)
    return guest ? guest.can_upload === 1 : true
  } catch {
    return true
  }
}

function deletePhotoLocal(id) {
  return null
}

/* ==================== WHATSAPP SUBMISSIONS ==================== */
function createWhatsAppSubmission(data) {
  return null
}

function getWhatsAppSubmissions() {
  return []
}

function updateSubmissionStatus() {
  return false
}

function approveAndCopyToGallery() {
  return false
}

function bulkUploadToReviewQueue() {
  return null
}

/* ==================== GUEST CRUD (backward compat) ==================== */
function getAllGuests() {
  return []
}

function addGuestLocal() {
  return null
}

function removeGuestLocal() {
  return null
}

function importGuestsLocal() {
  return 0
}

/* ==================== STATS HELPERS ==================== */
function getAccessLogs() {
  return []
}

async function getStatsData() {
  try {
    const data = await guestApi('/api/stats')
    return {
      totalGuests: data.totalGuests || 0,
      totalPhotos: data.approvedPhotos || 0,
      pendingReview: data.pendingReview || 0,
      engagementPhotos: data.engagementPhotos || 0,
      haldiPhotos: data.haldiPhotos || 0,
      weddingPhotos: data.weddingPhotos || 0
    }
  } catch {
    return {
      totalGuests: 0, totalPhotos: 0, pendingReview: 0,
      engagementPhotos: 0, haldiPhotos: 0, weddingPhotos: 0
    }
  }
}

/* ==================== LOCAL STORAGE COMPAT ==================== */
function localGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] }
  catch { return [] }
}
function localSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) }
  catch {}
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
