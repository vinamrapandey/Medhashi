/* ============================================
   AS WEDDING — Admin Dashboard Logic
   Login, Guests, Review, Gallery, Stats
   (localStorage — no Firebase)
   ============================================ */

const ADMIN_PASS = 'medhashi2026';
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let reviewSubmissions = [];
let selectedReviewIds = new Set();
let undoTimer = null;
let undoData = null;
let adminUploadFiles = [];
let currentGalleryFilter = 'all';
let currentReviewStatus = 'all';
let currentReviewEvent = 'all';

/* ==================== LOGIN ==================== */
function handleAdminLogin(e) {
    e.preventDefault();
    const input = document.getElementById('admin-password');
    const error = document.getElementById('login-error');

    if (input.value === ADMIN_PASS) {
        const session = { hash: btoa(ADMIN_PASS), expires: Date.now() + SESSION_DURATION };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        showDashboard();
    } else {
        error.style.display = 'block';
        input.value = '';
    }
}

function checkSession() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (session && session.hash === btoa(ADMIN_PASS) && Date.now() < session.expires) return true;
    } catch (e) { }
    return false;
}

function showDashboard() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadGuests();
    loadReview();
}

/* ==================== TAB SWITCHING ==================== */
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.admin-tabs .tab').forEach(t => t.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'guests') loadGuests();
    if (tabName === 'review') loadReview();
    if (tabName === 'gallery') loadGalleryTab();
    if (tabName === 'stats') loadStats();
}

/* ==================== GUESTS TAB ==================== */
function loadGuests() {
    const container = document.getElementById('guest-list');
    const guests = getAllGuests();

    document.getElementById('guest-count-badge').textContent = guests.length;

    if (guests.length === 0) {
        container.innerHTML = '<div class="empty-state">No guests yet. Add your first guest!</div>';
        return;
    }

    container.innerHTML = guests.map(g => {
        const events = g.events || [];
        return `
      <div class="guest-card">
        <div class="guest-card-top">
          <div>
            <div class="guest-card-name">👤 ${g.name}</div>
            <div class="guest-card-phone">📱 ${g.phone}</div>
          </div>
        </div>
        <div class="guest-card-events">
          <span class="event-badge ${events.includes('engagement') ? 'present' : 'absent'}">E</span>
          <span class="event-badge ${events.includes('haldi') ? 'present' : 'absent'}">H</span>
          <span class="event-badge ${events.includes('wedding') ? 'present' : 'absent'}">W</span>
        </div>
        <div class="guest-card-bottom">
          <span>Upload: ${g.canUpload ? '✅' : '❌'}</span>
          <div class="guest-card-actions">
            <button onclick="removeGuest('${g.id}', '${g.name}')" class="remove-btn">Remove</button>
          </div>
        </div>
      </div>`;
    }).join('');
}

function addGuest(e) {
    e.preventDefault();

    const name = document.getElementById('new-guest-name').value.trim();
    const phone = document.getElementById('new-guest-phone').value.trim();
    const checkboxes = document.querySelectorAll('#add-guest-modal .checkbox-group input:checked');
    const events = Array.from(checkboxes).map(cb => cb.value);
    const canUpload = document.getElementById('new-guest-upload').checked;

    if (!name || !phone) { showSnack('❌ Name and phone are required'); return; }

    addGuestLocal({ name, phone, events, canUpload });

    closeModal('add-guest-modal');
    document.getElementById('new-guest-name').value = '';
    document.getElementById('new-guest-phone').value = '';
    showSnack(`✅ Added: ${name}`);
    loadGuests();
}

function removeGuest(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    removeGuestLocal(id);
    showSnack(`Removed: ${name}`);
    loadGuests();
}

function openAddGuestModal() { document.getElementById('add-guest-modal').classList.add('visible'); }
function openCsvImport() { document.getElementById('csv-modal').classList.add('visible'); }

function importCsv() {
    const raw = document.getElementById('csv-input').value.trim();
    if (!raw) return;

    const lines = raw.split('\n').filter(l => l.trim());
    const newGuests = [];

    for (const line of lines) {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 2) continue;

        newGuests.push({
            name: parts[0],
            phone: parts[1],
            events: (parts[2] || 'engagement|haldi|wedding').split('|').map(s => s.trim()),
            canUpload: parts[3] !== 'false'
        });
    }

    const count = importGuestsLocal(newGuests);
    closeModal('csv-modal');
    document.getElementById('csv-input').value = '';
    showSnack(`📥 Imported ${count} guests`);
    loadGuests();
}

/* ==================== REVIEW TAB ==================== */
document.addEventListener('DOMContentLoaded', () => {
    if (checkSession()) showDashboard();

    // Filter listeners
    document.querySelectorAll('#review-status-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#review-status-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReviewStatus = btn.dataset.status;
            loadReview();
        });
    });

    document.querySelectorAll('#review-event-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#review-event-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReviewEvent = btn.dataset.event;
            loadReview();
        });
    });

    document.querySelectorAll('#gallery-event-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#gallery-event-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGalleryFilter = btn.dataset.event;
            loadGalleryTab();
        });
    });

    // Drag & drop
    const drop = document.getElementById('admin-file-drop');
    if (drop) {
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = '#C9A84C'; });
        drop.addEventListener('dragleave', () => { drop.style.borderColor = '#333'; });
        drop.addEventListener('drop', e => {
            e.preventDefault();
            drop.style.borderColor = '#333';
            adminUploadFiles = Array.from(e.dataTransfer.files);
            updateAdminFileInfo();
        });
    }
});

function loadReview() {
    const container = document.getElementById('review-cards');

    reviewSubmissions = getWhatsAppSubmissions(
        currentReviewStatus === 'all' ? null : currentReviewStatus,
        currentReviewEvent === 'all' ? null : currentReviewEvent
    );

    const pending = reviewSubmissions.filter(s => s.status === 'pending').length;
    document.getElementById('pending-count-badge').textContent = pending;
    document.getElementById('bulk-bar').classList.toggle('visible', pending > 0);

    if (reviewSubmissions.length === 0) {
        container.innerHTML = '<div class="empty-state">No submissions found</div>';
        return;
    }

    selectedReviewIds.clear();
    renderReviewCards();
}

function renderReviewCards() {
    const container = document.getElementById('review-cards');
    const eventLabels = { engagement: 'Engagement', haldi: 'Haldi & Sangeet', wedding: 'Wedding' };

    container.innerHTML = reviewSubmissions.map(sub => {
        const time = sub.receivedAt ? new Date(sub.receivedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const photos = sub.mediaUrls || [];
        const show = photos.slice(0, 4);
        const more = photos.length - 4;
        const isPending = sub.status === 'pending';

        return `
    <div class="review-card" id="rc-${sub.id}" data-id="${sub.id}">
      ${isPending ? `<input type="checkbox" class="review-card-cb" data-id="${sub.id}" onchange="toggleReviewSelect('${sub.id}', this.checked)" ${selectedReviewIds.has(sub.id) ? 'checked' : ''}>` : ''}
      <div class="review-card-meta">
        <div class="review-card-name">${sub.senderName || 'Unknown'}</div>
        <div class="review-card-info">📱 ${sub.senderPhone || '—'} • 🏷️ ${eventLabels[sub.eventTag] || sub.eventTag} • 🕐 ${time}</div>
        ${!isPending ? `<span class="status-badge-sm status-${sub.status}">${sub.status}</span>` : ''}
      </div>
      ${photos.length > 0 ? `
      <div class="review-card-photos" onclick="openReviewLightbox('${sub.id}')">
        ${show.map(u => `<img src="${u}" loading="lazy" alt="">`).join('')}
        ${more > 0 ? `<div class="review-photo-more">+${more}</div>` : ''}
      </div>` : ''}
      ${isPending ? `
      <div class="review-card-actions">
        <button class="review-btn-reject" onclick="handleReviewAction('${sub.id}', 'rejected')">✕ Reject</button>
        <button class="review-btn-approve" onclick="handleReviewAction('${sub.id}', 'approved')">✓ Approve</button>
      </div>` : ''}
    </div>`;
    }).join('');

    // Attach swipe to pending
    reviewSubmissions.filter(s => s.status === 'pending').forEach(sub => {
        const card = document.getElementById(`rc-${sub.id}`);
        if (card) attachSwipeGesture(card, sub.id);
    });
}

function attachSwipeGesture(card, docId) {
    let startX = 0, isDragging = false;
    const threshold = 80;

    const onStart = x => { startX = x; isDragging = true; card.classList.add('swiping'); };
    const onMove = x => {
        if (!isDragging) return;
        const dx = x - startX;
        card.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
    };
    const onEnd = x => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('swiping');
        const dx = x - startX;
        if (dx > threshold) { card.classList.add('swipe-approve'); setTimeout(() => handleReviewAction(docId, 'approved'), 300); }
        else if (dx < -threshold) { card.classList.add('swipe-reject'); setTimeout(() => handleReviewAction(docId, 'rejected'), 300); }
        else { card.style.transform = ''; }
    };

    card.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
    card.addEventListener('touchmove', e => onMove(e.touches[0].clientX), { passive: true });
    card.addEventListener('touchend', e => onEnd(e.changedTouches[0].clientX));

    card.addEventListener('mousedown', e => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; onStart(e.clientX); });
    const moveHandler = e => { if (isDragging) onMove(e.clientX); };
    const upHandler = e => { if (isDragging) onEnd(e.clientX); };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
}

function handleReviewAction(docId, status) {
    const sub = reviewSubmissions.find(s => s.id === docId);
    if (!sub) return;

    if (status === 'approved') {
        approveAndCopyToGallery(sub);
        showSnack(`✅ Approved: ${sub.senderName}`);
    } else {
        undoData = { docId, previousStatus: sub.status };
        updateSubmissionStatus(docId, 'rejected', 'admin');
        showSnack(`❌ Rejected: ${sub.senderName}`, true);
        undoTimer = setTimeout(() => { undoData = null; hideSnack(); }, 5000);
    }
    loadReview();
}

function toggleReviewSelect(id, checked) {
    if (checked) selectedReviewIds.add(id); else selectedReviewIds.delete(id);
    document.getElementById('selected-count-text').textContent = selectedReviewIds.size > 0 ? `${selectedReviewIds.size} selected` : '';
}

function toggleSelectAll(checked) {
    reviewSubmissions.filter(s => s.status === 'pending').forEach(s => {
        if (checked) selectedReviewIds.add(s.id); else selectedReviewIds.delete(s.id);
    });
    document.querySelectorAll('.review-card-cb').forEach(cb => cb.checked = checked);
    document.getElementById('selected-count-text').textContent = selectedReviewIds.size > 0 ? `${selectedReviewIds.size} selected` : '';
}

function bulkAction(status) {
    if (selectedReviewIds.size === 0) return;
    const ids = [...selectedReviewIds];
    for (const id of ids) {
        const sub = reviewSubmissions.find(s => s.id === id);
        if (!sub) continue;
        if (status === 'approved') approveAndCopyToGallery(sub);
        else updateSubmissionStatus(id, status, 'admin');
    }
    showSnack(`${status === 'approved' ? '✅' : '❌'} ${ids.length} submissions ${status}`);
    selectedReviewIds.clear();
    loadReview();
}

function openReviewLightbox(docId) {
    const sub = reviewSubmissions.find(s => s.id === docId);
    if (!sub || !sub.mediaUrls || sub.mediaUrls.length === 0) return;
    const img = document.getElementById('lightbox-full-img');
    img.src = sub.mediaUrls[0];
    document.getElementById('lightbox-meta').innerHTML = `
    <strong>${sub.senderName}</strong><br>
    📱 ${sub.senderPhone || '—'} • 🏷️ ${sub.eventTag}<br>
    ${sub.mediaUrls.length} photo(s)
  `;
    document.getElementById('lightbox-delete-btn').style.display = 'none';
    document.getElementById('gallery-lightbox').classList.add('visible');
}

// Upload to review queue
function openUploadModal() { document.getElementById('upload-modal').classList.add('visible'); }

function handleAdminFileSelect(e) {
    adminUploadFiles = Array.from(e.target.files);
    updateAdminFileInfo();
}

function updateAdminFileInfo() {
    document.getElementById('admin-file-info').textContent = adminUploadFiles.length > 0 ? `${adminUploadFiles.length} file(s) selected` : '';
    document.getElementById('admin-upload-btn').disabled = adminUploadFiles.length === 0;
}

async function submitAdminUpload() {
    const name = document.getElementById('upload-sender-name').value.trim();
    const phone = document.getElementById('upload-sender-phone').value.trim();
    const event = document.getElementById('upload-event').value;
    const btn = document.getElementById('admin-upload-btn');

    if (!name || adminUploadFiles.length === 0) return;

    btn.disabled = true;
    btn.textContent = 'Uploading...';

    const result = await bulkUploadToReviewQueue(adminUploadFiles, name, phone, event);

    if (result) {
        showSnack(`📤 Uploaded ${adminUploadFiles.length} files for "${name}"`);
        closeModal('upload-modal');
        document.getElementById('upload-sender-name').value = '';
        document.getElementById('upload-sender-phone').value = '';
        document.getElementById('admin-file-input').value = '';
        adminUploadFiles = [];
        updateAdminFileInfo();
        loadReview();
    } else {
        showSnack('❌ Upload failed');
    }

    btn.disabled = false;
    btn.textContent = 'Upload & Add to Queue';
}

/* ==================== GALLERY TAB ==================== */
function loadGalleryTab() {
    const container = document.getElementById('gallery-grid');
    let photos = localGet('as_photos').filter(p => p.approved);

    if (currentGalleryFilter !== 'all') {
        photos = photos.filter(p => p.event === currentGalleryFilter);
    }

    if (photos.length === 0) {
        container.innerHTML = '<div class="empty-state">No approved photos yet</div>';
        return;
    }

    container.innerHTML = photos.slice(0, 200).map(p => `
      <div class="admin-gallery-item" onclick="openGalleryLightbox('${p.id}')">
        <img src="${p.url}" loading="lazy" alt="">
      </div>
    `).join('');
}

function openGalleryLightbox(docId) {
    const photos = localGet('as_photos');
    const p = photos.find(ph => ph.id === docId);
    if (!p) return;

    document.getElementById('lightbox-full-img').src = p.url;
    const time = p.timestamp ? new Date(p.timestamp).toLocaleString() : '—';
    document.getElementById('lightbox-meta').innerHTML = `
    <strong>${p.uploadedBy || '—'}</strong> (${p.source || 'direct'})<br>
    🏷️ ${p.event || ''} • 🕐 ${time}
  `;

    const deleteBtn = document.getElementById('lightbox-delete-btn');
    deleteBtn.style.display = 'block';
    deleteBtn.onclick = () => {
        if (!confirm('Delete this photo from gallery?')) return;
        deletePhotoLocal(docId);
        closeModal('gallery-lightbox');
        showSnack('🗑 Photo deleted');
        loadGalleryTab();
    };

    document.getElementById('gallery-lightbox').classList.add('visible');
}

/* ==================== STATS TAB ==================== */
function loadStats() {
    const container = document.getElementById('stats-cards');
    const stats = getStatsData();

    container.innerHTML = `
      <div class="stat-card"><div class="stat-card-value">${stats.totalGuests}</div><div class="stat-card-label">Total Guests</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.totalPhotos}</div><div class="stat-card-label">Gallery Photos</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.pendingReview}</div><div class="stat-card-label">Pending Review</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.engagementPhotos}</div><div class="stat-card-label">Engagement</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.haldiPhotos}</div><div class="stat-card-label">Haldi & Sangeet</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.weddingPhotos}</div><div class="stat-card-label">Wedding</div></div>
    `;

    // Recent logins
    const logs = getAccessLogs(5);
    if (logs.length > 0) {
        const section = document.getElementById('recent-logins-section');
        section.style.display = 'block';
        document.getElementById('recent-logins').innerHTML = logs.map(d => {
            const time = d.timestamp ? new Date(d.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
            return `<div class="login-row"><span>${d.name || d.phone}</span><span>${time}</span></div>`;
        }).join('');
    }
}

/* ==================== MODALS ==================== */
function closeModal(id) { document.getElementById(id).classList.remove('visible'); }

/* ==================== SNACKBAR ==================== */
function showSnack(text, showUndo = false) {
    const bar = document.getElementById('admin-snackbar');
    document.getElementById('snackbar-text').textContent = text;
    document.getElementById('snackbar-undo').style.display = showUndo ? 'inline-block' : 'none';
    bar.classList.add('visible');
    if (!showUndo) setTimeout(hideSnack, 3000);
}

function hideSnack() { document.getElementById('admin-snackbar').classList.remove('visible'); }

function undoLastAction() {
    if (!undoData) return;
    clearTimeout(undoTimer);
    updateSubmissionStatus(undoData.docId, 'pending', null);
    hideSnack();
    showSnack('↩️ Undone');
    undoData = null;
    loadReview();
}
