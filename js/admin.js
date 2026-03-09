/* ============================================
   AS WEDDING — Admin Panel Logic
   ============================================ */

const ADMIN_PASSWORD = 'aswedding2026';
let adminCurrentPhotoFilter = 'all';

/* ---- Login ---- */
function handleAdminLogin(e) {
    e.preventDefault();
    const input = document.getElementById('admin-password');
    const error = document.getElementById('login-error');

    if (input.value === ADMIN_PASSWORD) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        initFirebase();
        loadGuests();
        loadAdminPhotos('all');
        loadAccessLogs();
    } else {
        error.style.display = 'block';
        input.value = '';
        input.focus();
    }
}

/* ---- Tab Switching ---- */
function switchTab(tab) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));

    document.getElementById(`section-${tab}`).classList.add('active');
    event.target.classList.add('active');
}

/* ---- Guest Management ---- */
async function loadGuests() {
    const tbody = document.getElementById('guest-table-body');
    if (!db) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Firebase not connected. Update firebase-config.js with your credentials.</td></tr>';
        return;
    }

    try {
        const snapshot = await db.collection('guests').orderBy('name').get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">No guests added yet.</td></tr>';
            return;
        }

        tbody.innerHTML = snapshot.docs.map(doc => {
            const g = doc.data();
            const events = (g.events || []).join(', ');
            const uploadClass = g.canUpload ? 'on' : '';
            const uploadText = g.canUpload ? '✅ On' : '❌ Off';

            return `
        <tr>
          <td><strong>${g.name}</strong>${g.nameHindi ? `<br><small style="color:#8B7355">${g.nameHindi}</small>` : ''}</td>
          <td>${g.phone}</td>
          <td><small>${events}</small></td>
          <td>
            <button class="toggle-btn ${uploadClass}" onclick="toggleUpload('${doc.id}', ${!g.canUpload})">
              ${uploadText}
            </button>
          </td>
          <td>
            <button class="delete-btn" onclick="deleteGuest('${doc.id}', '${g.name}')">🗑 Delete</button>
          </td>
        </tr>
      `;
        }).join('');
    } catch (error) {
        console.error('Load guests error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Error loading guests.</td></tr>';
    }
}

async function addGuest(e) {
    e.preventDefault();
    if (!db) { alert('Firebase not connected.'); return; }

    const name = document.getElementById('guest-name').value.trim();
    const phone = document.getElementById('guest-phone').value.trim();
    const eventsSelect = document.getElementById('guest-events');
    const events = Array.from(eventsSelect.selectedOptions).map(o => o.value);

    if (!name || !phone) return;

    try {
        await db.collection('guests').add({
            name,
            nameHindi: '',
            phone,
            events,
            canUpload: true,
            addedBy: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reset form
        document.getElementById('guest-name').value = '';
        document.getElementById('guest-phone').value = '';

        // Reload
        loadGuests();
    } catch (error) {
        console.error('Add guest error:', error);
        alert('Error adding guest: ' + error.message);
    }
}

async function toggleUpload(docId, newValue) {
    if (!db) return;

    try {
        await db.collection('guests').doc(docId).update({ canUpload: newValue });
        loadGuests();
    } catch (error) {
        console.error('Toggle upload error:', error);
    }
}

async function deleteGuest(docId, name) {
    if (!confirm(`Delete guest "${name}"?`)) return;
    if (!db) return;

    try {
        await db.collection('guests').doc(docId).delete();
        loadGuests();
    } catch (error) {
        console.error('Delete guest error:', error);
    }
}

/* ---- Photo Management ---- */
async function loadAdminPhotos(filter) {
    const grid = document.getElementById('admin-photo-grid');
    if (!db) {
        grid.innerHTML = '<div class="admin-empty">Firebase not connected.</div>';
        return;
    }

    try {
        let query = db.collection('photos').orderBy('timestamp', 'desc');
        if (filter !== 'all') {
            query = query.where('event', '==', filter);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            grid.innerHTML = '<div class="admin-empty">No photos uploaded yet.</div>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const p = doc.data();
            return `
        <div class="admin-photo-item" title="${p.uploadedBy} — ${p.event}">
          <img src="${p.url}" alt="Photo by ${p.uploadedBy}" loading="lazy">
        </div>
      `;
        }).join('');
    } catch (error) {
        console.error('Load photos error:', error);
        grid.innerHTML = '<div class="admin-empty">Error loading photos.</div>';
    }
}

function filterPhotos(filter, btn) {
    adminCurrentPhotoFilter = filter;
    document.querySelectorAll('.event-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadAdminPhotos(filter);
}

async function downloadAllPhotos() {
    if (!db) { alert('Firebase not connected.'); return; }
    if (typeof JSZip === 'undefined') { alert('JSZip not loaded.'); return; }

    const filter = adminCurrentPhotoFilter;
    let query = db.collection('photos').orderBy('timestamp', 'desc');
    if (filter !== 'all') {
        query = query.where('event', '==', filter);
    }

    try {
        const snapshot = await query.get();
        if (snapshot.empty) { alert('No photos to download.'); return; }

        const zip = new JSZip();
        const photos = snapshot.docs.map(d => d.data());

        alert(`Downloading ${photos.length} photos. This may take a moment...`);

        for (let i = 0; i < photos.length; i++) {
            try {
                const response = await fetch(photos[i].url);
                const blob = await response.blob();
                const ext = photos[i].fileType?.split('/')[1] || 'jpg';
                zip.file(`${photos[i].event}_${i + 1}.${ext}`, blob);
            } catch (err) {
                console.warn(`Failed to download photo ${i + 1}:`, err);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `AS_Wedding_Photos_${filter}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (error) {
        console.error('Download all error:', error);
        alert('Error downloading photos.');
    }
}

/* ---- Access Logs ---- */
async function loadAccessLogs() {
    const tbody = document.getElementById('log-table-body');
    if (!db) {
        tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">Firebase not connected.</td></tr>';
        return;
    }

    try {
        const snapshot = await db.collection('accessLog')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">No access logs yet.</td></tr>';
            return;
        }

        tbody.innerHTML = snapshot.docs.map(doc => {
            const log = doc.data();
            const time = log.timestamp ? log.timestamp.toDate().toLocaleString('en-IN') : 'N/A';
            const device = parseUserAgent(log.userAgent || '');

            return `
        <tr>
          <td>${log.name || 'Unknown'}</td>
          <td>${log.phone || 'N/A'}</td>
          <td>${time}</td>
          <td><small>${device}</small></td>
        </tr>
      `;
        }).join('');
    } catch (error) {
        console.error('Load logs error:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">Error loading logs.</td></tr>';
    }
}

function parseUserAgent(ua) {
    if (ua.includes('iPhone')) return '📱 iPhone';
    if (ua.includes('Android')) return '📱 Android';
    if (ua.includes('iPad')) return '📱 iPad';
    if (ua.includes('Mac')) return '💻 Mac';
    if (ua.includes('Windows')) return '💻 Windows';
    if (ua.includes('Linux')) return '💻 Linux';
    return '🌐 Browser';
}
