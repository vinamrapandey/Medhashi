/* ============================================
   AS WEDDING — Local Database (localStorage)
   No Firebase — fully static, offline-first
   ============================================ */

/* ---- Storage helpers ---- */
function localGet(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
}

function localSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { console.error('localStorage write error:', e); }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/* ---- "Database" initialization (no-op, kept for backward compat) ---- */
let db = true; // truthy so existing !db guards still work
let storage = null;

function initFirebase() {
    // No-op — data lives in localStorage now
    console.log('Local database active (localStorage).');
    return true;
}

/* ==================== GUESTS ==================== */
function lookupGuest(phone) {
    const guests = localGet('as_guests');
    const guest = guests.find(g => g.phone === phone);
    if (guest) return guest;

    // Always allow any phone number for demo/wedding access
    return { name: 'Guest', nameHindi: 'अतिथि', phone, events: ['engagement', 'haldi', 'wedding'], canUpload: true };
}

function logGuestAccess(phone, name) {
    const logs = localGet('as_access_logs');
    logs.unshift({ phone, name, timestamp: new Date().toISOString(), userAgent: navigator.userAgent });
    if (logs.length > 100) logs.length = 100; // cap
    localSet('as_access_logs', logs);
}

/* ==================== GUEST CRUD (Admin) ==================== */
function getAllGuests() {
    return localGet('as_guests').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function addGuestLocal(data) {
    const guests = localGet('as_guests');
    const guest = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    guests.push(guest);
    localSet('as_guests', guests);
    return guest;
}

function removeGuestLocal(id) {
    const guests = localGet('as_guests').filter(g => g.id !== id);
    localSet('as_guests', guests);
}

function importGuestsLocal(newGuests) {
    const guests = localGet('as_guests');
    for (const g of newGuests) {
        guests.push({ id: generateId(), ...g, createdAt: new Date().toISOString() });
    }
    localSet('as_guests', guests);
    return newGuests.length;
}

/* ==================== PHOTOS ==================== */
function uploadPhoto(file, eventName, phone) {
    // For local mode, store as data URL
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result;
            const photos = localGet('as_photos');
            photos.unshift({
                id: generateId(),
                event: eventName,
                uploadedBy: sessionStorage.getItem('guest_name') || 'Unknown',
                phone,
                url,
                timestamp: new Date().toISOString(),
                approved: true,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                source: 'direct'
            });
            localSet('as_photos', photos);
            resolve(url);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

function getPhotos(eventName) {
    const photos = localGet('as_photos');
    return photos.filter(p => p.event === eventName && p.approved);
}

function checkUploadPermission(phone) {
    const guests = localGet('as_guests');
    const guest = guests.find(g => g.phone === phone);
    return guest ? guest.canUpload !== false : true; // default allow
}

function deletePhotoLocal(id) {
    const photos = localGet('as_photos').filter(p => p.id !== id);
    localSet('as_photos', photos);
}

/* ==================== WHATSAPP SUBMISSIONS ==================== */
function createWhatsAppSubmission(data) {
    const submissions = localGet('as_wa_submissions');
    const sub = {
        id: generateId(),
        senderName: data.senderName || '',
        senderPhone: data.senderPhone || '',
        eventTag: data.eventTag || '',
        mediaUrls: data.mediaUrls || [],
        receivedAt: new Date().toISOString(),
        status: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        note: null
    };
    submissions.unshift(sub);
    localSet('as_wa_submissions', submissions);
    return sub.id;
}

function getWhatsAppSubmissions(statusFilter, eventFilter) {
    let subs = localGet('as_wa_submissions');
    if (statusFilter && statusFilter !== 'all') subs = subs.filter(s => s.status === statusFilter);
    if (eventFilter && eventFilter !== 'all') subs = subs.filter(s => s.eventTag === eventFilter);
    return subs;
}

function updateSubmissionStatus(docId, status, reviewedBy) {
    const subs = localGet('as_wa_submissions');
    const idx = subs.findIndex(s => s.id === docId);
    if (idx === -1) return false;
    subs[idx].status = status;
    subs[idx].reviewedAt = new Date().toISOString();
    subs[idx].reviewedBy = reviewedBy || 'admin';
    localSet('as_wa_submissions', subs);
    return true;
}

function approveAndCopyToGallery(submission) {
    updateSubmissionStatus(submission.id, 'approved', 'admin');
    const photos = localGet('as_photos');
    const urls = submission.mediaUrls || [];
    for (const url of urls) {
        photos.unshift({
            id: generateId(),
            event: submission.eventTag,
            uploadedBy: submission.senderName || 'WhatsApp Guest',
            phone: submission.senderPhone || '',
            url,
            source: 'whatsapp',
            approved: true,
            timestamp: new Date().toISOString(),
            submissionId: submission.id,
            fileName: '',
            fileSize: 0,
            fileType: 'image/jpeg'
        });
    }
    localSet('as_photos', photos);
    return true;
}

function bulkUploadToReviewQueue(files, senderName, senderPhone, eventTag) {
    return new Promise((resolve) => {
        const mediaUrls = [];
        let done = 0;
        if (files.length === 0) { resolve(null); return; }

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = () => {
                mediaUrls.push(reader.result);
                done++;
                if (done === files.length) {
                    const id = createWhatsAppSubmission({ senderName, senderPhone, eventTag, mediaUrls });
                    resolve(id);
                }
            };
            reader.onerror = () => { done++; if (done === files.length) resolve(mediaUrls.length > 0 ? 'ok' : null); };
            reader.readAsDataURL(file);
        }
    });
}

/* ==================== STATS HELPERS ==================== */
function getAccessLogs(limit) {
    const logs = localGet('as_access_logs');
    return logs.slice(0, limit || 5);
}

function getStatsData() {
    const guests = localGet('as_guests');
    const photos = localGet('as_photos').filter(p => p.approved);
    const subs = localGet('as_wa_submissions');
    return {
        totalGuests: guests.length,
        totalPhotos: photos.length,
        pendingReview: subs.filter(s => s.status === 'pending').length,
        engagementPhotos: photos.filter(p => p.event === 'engagement').length,
        haldiPhotos: photos.filter(p => p.event === 'haldi').length,
        weddingPhotos: photos.filter(p => p.event === 'wedding').length
    };
}
