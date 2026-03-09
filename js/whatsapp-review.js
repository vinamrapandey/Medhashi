/* ============================================
   AS WEDDING — WhatsApp Review Dashboard Logic
   Card rendering, swipe gestures, bulk actions,
   modal viewer, undo snackbar, bulk upload
   ============================================ */

const ADMIN_PASSWORD = 'aswedding2026';

let currentStatusFilter = 'all';
let currentEventFilter = 'all';
let submissions = [];
let selectedIds = new Set();
let undoTimer = null;
let undoAction = null;
let modalSubmission = null;
let bulkFiles = [];

/* ==================== LOGIN ==================== */
function handleWALogin(e) {
    e.preventDefault();
    const input = document.getElementById('wa-password');
    const error = document.getElementById('wa-login-error');

    if (input.value === ADMIN_PASSWORD) {
        document.getElementById('wa-login').style.display = 'none';
        document.getElementById('wa-dashboard').style.display = 'block';
        initFirebase();
        loadSubmissions();
    } else {
        error.style.display = 'block';
        input.value = '';
        input.focus();
    }
}

/* ==================== FILTERS ==================== */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#wa-status-filters .wa-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#wa-status-filters .wa-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatusFilter = btn.dataset.status;
            loadSubmissions();
        });
    });

    document.querySelectorAll('#wa-event-filters .wa-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#wa-event-filters .wa-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentEventFilter = btn.dataset.event;
            loadSubmissions();
        });
    });

    // Drag & drop for bulk upload
    const drop = document.getElementById('wa-file-drop');
    if (drop) {
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.borderColor = '#C9A84C'; });
        drop.addEventListener('dragleave', () => { drop.style.borderColor = '#E8D5A3'; });
        drop.addEventListener('drop', (e) => {
            e.preventDefault();
            drop.style.borderColor = '#E8D5A3';
            if (e.dataTransfer.files.length) {
                bulkFiles = Array.from(e.dataTransfer.files);
                updateFileCount();
            }
        });
    }
});

/* ==================== LOAD SUBMISSIONS ==================== */
async function loadSubmissions() {
    const container = document.getElementById('wa-cards');
    container.innerHTML = '<div class="wa-empty"><div class="wa-empty-icon">⏳</div><p>Loading...</p></div>';

    submissions = await getWhatsAppSubmissions(
        currentStatusFilter === 'all' ? null : currentStatusFilter,
        currentEventFilter === 'all' ? null : currentEventFilter
    );

    // Update pending badge
    const pendingCount = submissions.filter(s => s.status === 'pending').length;
    const badge = document.getElementById('wa-pending-badge');
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }

    // Show/hide bulk bar
    const hasPending = submissions.some(s => s.status === 'pending');
    document.getElementById('wa-bulk-bar').classList.toggle('visible', hasPending);

    if (submissions.length === 0) {
        container.innerHTML = '<div class="wa-empty"><div class="wa-empty-icon">📱</div><p>No submissions found.</p></div>';
        return;
    }

    selectedIds.clear();
    renderCards();
}

/* ==================== RENDER CARDS ==================== */
function renderCards() {
    const container = document.getElementById('wa-cards');

    container.innerHTML = submissions.map(sub => {
        const time = sub.receivedAt ? sub.receivedAt.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
        const photos = sub.mediaUrls || [];
        const maxShow = 4;
        const showPhotos = photos.slice(0, maxShow);
        const moreCount = photos.length - maxShow;
        const eventLabel = { engagement: 'Engagement', haldi: 'Haldi & Sangeet', wedding: 'Wedding' }[sub.eventTag] || sub.eventTag;
        const statusClass = `wa-status-${sub.status || 'pending'}`;
        const isPending = sub.status === 'pending';

        return `
    <div class="wa-card" id="card-${sub.id}" data-id="${sub.id}">
      ${isPending ? `<input type="checkbox" class="wa-card-checkbox" data-id="${sub.id}" onchange="toggleSelect('${sub.id}', this.checked)" ${selectedIds.has(sub.id) ? 'checked' : ''}>` : ''}
      <div class="wa-card-meta">
        <span class="wa-card-name">👤 ${sub.senderName || 'Unknown'}</span>
        <span class="wa-card-phone">📱 ${sub.senderPhone || 'N/A'}</span>
        <span class="wa-card-event">🏷️ ${eventLabel}</span>
        <span class="wa-card-time">🕐 ${time}</span>
        ${!isPending ? `<span class="wa-status-badge ${statusClass}">${sub.status}</span>` : ''}
      </div>

      ${photos.length > 0 ? `
      <div class="wa-card-photos" onclick="openReviewModal('${sub.id}')">
        ${showPhotos.map(url => `<div class="wa-card-photo"><img src="${url}" loading="lazy" alt=""></div>`).join('')}
        ${moreCount > 0 ? `<div class="wa-card-photo wa-card-photo-more">+${moreCount} more</div>` : ''}
      </div>
      ` : '<p style="font-size: 0.75rem; color: #8B7355; margin-bottom: 10px;">No media attached</p>'}

      ${isPending ? `
      <div class="wa-card-actions">
        <button class="wa-card-btn wa-btn-reject" onclick="handleCardAction('${sub.id}', 'rejected')">← Reject</button>
        <button class="wa-card-btn wa-btn-approve" onclick="handleCardAction('${sub.id}', 'approved')">Approve →</button>
      </div>
      ` : ''}
    </div>
    `;
    }).join('');

    // Attach swipe gestures to pending cards
    submissions.filter(s => s.status === 'pending').forEach(sub => {
        const card = document.getElementById(`card-${sub.id}`);
        if (card) attachSwipe(card, sub.id);
    });
}

/* ==================== SWIPE GESTURES ==================== */
function attachSwipe(card, docId) {
    let startX = 0, currentX = 0, isDragging = false;
    const threshold = 80;

    const onStart = (x) => {
        startX = x;
        currentX = x;
        isDragging = true;
        card.classList.add('swiping');
    };

    const onMove = (x) => {
        if (!isDragging) return;
        currentX = x;
        const dx = currentX - startX;
        const rotation = dx * 0.05;
        card.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;

        // Tint based on direction
        if (dx > 30) {
            card.style.background = `rgba(37, 211, 102, ${Math.min(Math.abs(dx) / 300, 0.15)})`;
        } else if (dx < -30) {
            card.style.background = `rgba(107, 39, 55, ${Math.min(Math.abs(dx) / 300, 0.15)})`;
        } else {
            card.style.background = '';
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('swiping');
        const dx = currentX - startX;

        if (dx > threshold) {
            card.classList.add('swipe-approve');
            setTimeout(() => handleCardAction(docId, 'approved'), 300);
        } else if (dx < -threshold) {
            card.classList.add('swipe-reject');
            setTimeout(() => handleCardAction(docId, 'rejected'), 300);
        } else {
            card.style.transform = '';
            card.style.background = '';
        }
    };

    // Touch events
    card.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    card.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
    card.addEventListener('touchend', onEnd);

    // Mouse events
    card.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        onStart(e.clientX);
    });
    document.addEventListener('mousemove', (e) => { if (isDragging) onMove(e.clientX); });
    document.addEventListener('mouseup', () => { if (isDragging) onEnd(); });
}

/* ==================== CARD ACTIONS ==================== */
async function handleCardAction(docId, status) {
    const sub = submissions.find(s => s.id === docId);
    if (!sub) return;

    if (status === 'approved') {
        await approveAndCopyToGallery(sub);
        showSnackbar(`✅ Approved: ${sub.senderName}`);
    } else {
        // Store undo info before updating
        undoAction = { docId, previousStatus: 'pending', submission: sub };
        await updateSubmissionStatus(docId, 'rejected', 'admin');
        showSnackbar(`❌ Rejected: ${sub.senderName} — `, true);

        // Auto-finalize after 5 seconds
        undoTimer = setTimeout(() => {
            undoAction = null;
            hideSnackbar();
        }, 5000);
    }

    loadSubmissions();
}

/* ==================== BULK ACTIONS ==================== */
function toggleSelect(id, checked) {
    if (checked) selectedIds.add(id); else selectedIds.delete(id);
    updateSelectedCount();
}

function toggleSelectAll(checked) {
    const pending = submissions.filter(s => s.status === 'pending');
    if (checked) {
        pending.forEach(s => selectedIds.add(s.id));
    } else {
        selectedIds.clear();
    }
    // Update checkboxes
    document.querySelectorAll('.wa-card-checkbox').forEach(cb => { cb.checked = checked; });
    updateSelectedCount();
}

function updateSelectedCount() {
    const el = document.getElementById('wa-selected-count');
    el.textContent = selectedIds.size > 0 ? `${selectedIds.size} selected` : '';
}

async function bulkAction(status) {
    if (selectedIds.size === 0) return;

    const ids = [...selectedIds];
    for (const id of ids) {
        const sub = submissions.find(s => s.id === id);
        if (!sub) continue;

        if (status === 'approved') {
            await approveAndCopyToGallery(sub);
        } else {
            await updateSubmissionStatus(id, status, 'admin');
        }
    }

    showSnackbar(`${status === 'approved' ? '✅' : '❌'} ${ids.length} submissions ${status}`);
    selectedIds.clear();
    loadSubmissions();
}

/* ==================== SNACKBAR ==================== */
function showSnackbar(text, showUndo = false) {
    const snackbar = document.getElementById('wa-snackbar');
    document.getElementById('wa-snackbar-text').textContent = text;
    document.getElementById('wa-snackbar-undo').style.display = showUndo ? 'inline-block' : 'none';
    snackbar.classList.add('visible');

    if (!showUndo) {
        setTimeout(hideSnackbar, 3000);
    }
}

function hideSnackbar() {
    document.getElementById('wa-snackbar').classList.remove('visible');
}

async function undoLastAction() {
    if (!undoAction) return;
    clearTimeout(undoTimer);

    await updateSubmissionStatus(undoAction.docId, 'pending', null);
    hideSnackbar();
    showSnackbar('↩️ Undone — back to pending');
    undoAction = null;
    loadSubmissions();
}

/* ==================== REVIEW MODAL ==================== */
function openReviewModal(docId) {
    const sub = submissions.find(s => s.id === docId);
    if (!sub) return;
    modalSubmission = sub;

    document.getElementById('wa-modal-title').textContent = `${sub.senderName} — ${sub.eventTag}`;
    document.getElementById('wa-modal-photos').innerHTML = (sub.mediaUrls || []).map(url =>
        `<div class="wa-modal-photo"><img src="${url}" alt=""></div>`
    ).join('');

    // Show/hide actions based on status
    document.getElementById('wa-modal-actions').style.display = sub.status === 'pending' ? 'flex' : 'none';

    document.getElementById('wa-modal').classList.add('visible');
}

function closeReviewModal() {
    document.getElementById('wa-modal').classList.remove('visible');
    modalSubmission = null;
}

async function modalAction(status) {
    if (!modalSubmission) return;
    closeReviewModal();
    await handleCardAction(modalSubmission.id, status);
}

/* ==================== BULK UPLOAD ==================== */
function handleBulkFileSelect(e) {
    bulkFiles = Array.from(e.target.files);
    updateFileCount();
}

function updateFileCount() {
    const el = document.getElementById('wa-file-count');
    const btn = document.getElementById('wa-upload-submit');

    if (bulkFiles.length > 0) {
        el.textContent = `${bulkFiles.length} file(s) selected`;
        btn.disabled = false;
    } else {
        el.textContent = '';
        btn.disabled = true;
    }
}

async function submitBulkUpload() {
    const name = document.getElementById('wa-upload-name').value.trim();
    const phone = document.getElementById('wa-upload-phone').value.trim();
    const event = document.getElementById('wa-upload-event').value;
    const btn = document.getElementById('wa-upload-submit');

    if (!name || bulkFiles.length === 0) {
        alert('Please enter sender name and select files.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Uploading...';

    const result = await bulkUploadToReviewQueue(bulkFiles, name, phone, event);

    if (result) {
        showSnackbar(`📤 ${bulkFiles.length} files uploaded for "${name}"`);
        // Reset form
        document.getElementById('wa-upload-name').value = '';
        document.getElementById('wa-upload-phone').value = '';
        document.getElementById('wa-file-input').value = '';
        bulkFiles = [];
        updateFileCount();
        loadSubmissions();
    } else {
        showSnackbar('❌ Upload failed. Check Firebase connection.');
    }

    btn.disabled = false;
    btn.textContent = 'Upload & Add to Queue';
}
