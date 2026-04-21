const API_BASE = 'https://medhashi-api.medhashi.workers.dev';
    const state = { token: null, workspaceId: null, workspaceName: null, tab: 'overview', guests: [], submissions: [], gallery: [], stats: {}, config: {}, configItems: [] };

    window.onload = () => {
      const stored = sessionStorage.getItem('admin_token');
      if (stored) {
        state.token = stored;
        state.workspaceId = sessionStorage.getItem('admin_ws_id');
        state.workspaceName = sessionStorage.getItem('admin_ws_name');
        showDashboard();
      }
    };

    async function api(method, path, body) {
      const res = await fetch(API_BASE + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.token
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) {
        let err = { error: 'API Error' };
        try { err = await res.json(); } catch(e){}
        throw new Error(err.error || 'API Error');
      }
      return res.json();
    }

    function showToast(message, type = 'success') {
      const tc = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast ${type === 'error' ? 'error' : ''}`;
      toast.textContent = message;
      tc.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function showDashboard() {
      document.getElementById('login-state').classList.add('hidden');
      document.getElementById('dashboard-state').classList.remove('hidden');
      document.getElementById('sidebar-ws').textContent = state.workspaceName;
      switchTab('overview');
    }

    async function handleLogin() {
      const pin = document.getElementById('login-pwd').value;
      if (!pin) return;
      try {
        const res = await fetch(API_BASE + '/auth/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ workspaceId: 'medhashi-aands-2026', pin })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const tokenStr = data.token.replace('Bearer ', '');
        const payload = JSON.parse(atob(tokenStr));
        if (!payload.isAdmin) throw new Error('Not an admin account');
        
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_ws_id', data.workspaceId);
        sessionStorage.setItem('admin_ws_name', data.workspaceName);
        
        state.token = data.token;
        state.workspaceId = data.workspaceId;
        state.workspaceName = data.workspaceName;
        
        const mobileWsName = document.getElementById('mobile-workspace-name');
        if (mobileWsName) mobileWsName.textContent = state.workspaceName || '';
        
        showDashboard();
      } catch (e) {
        document.getElementById('login-error').textContent = e.message || 'Login failed';
      }
    }

    function handleSignOut() {
      sessionStorage.clear();
      state.token = null;
      document.getElementById('login-state').classList.remove('hidden');
      document.getElementById('dashboard-state').classList.add('hidden');
      document.getElementById('login-pwd').value = '';
    }

    function switchTab(tabName) {
      document.querySelectorAll('.nav-item[data-tab]').forEach(el => el.classList.remove('active'));
      const activeNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
      if(activeNav) activeNav.classList.add('active');
      
      // Sync bottom nav active state
      document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
      });

      document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tabName).classList.add('active');
      state.tab = tabName;



      if (tabName === 'overview') loadOverview();
      else if (tabName === 'guests') loadGuests();
      else if (tabName === 'review') loadReview();
      else if (tabName === 'gallery') loadGallery();
      else if (tabName === 'settings') loadSettings();
      else if (tabName === 'config') loadConfig();
    }

    async function loadOverview() {
      try {
        const data = await api('GET', '/api/stats');
        document.getElementById('stat-guests').textContent = data.totalGuests;
        document.getElementById('stat-pending').textContent = data.pendingReview;
        document.getElementById('stat-approved').textContent = data.approvedPhotos;
        
        const badge = document.getElementById('badge-pending');
        if (data.pendingReview > 0) { badge.textContent = data.pendingReview; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');
        
        const bottomBadge = document.getElementById('bottom-pending-badge');
        if (bottomBadge) {
          const count = data.pendingReview;
          bottomBadge.textContent = count;
          bottomBadge.style.display = count > 0 ? 'block' : 'none';
        }
        
        if (state.config && state.config.weddingDate) {
           document.getElementById('overview-sub').textContent = state.workspaceName + ' • ' + state.config.weddingDate;
        } else {
           document.getElementById('overview-sub').textContent = state.workspaceName;
        }
      } catch (e) { showToast(e.message, 'error'); }
    }

    let currentGuestEventFilter = 'all';
    async function loadGuests() {
      try {
        const data = await api('GET', '/api/guests');
        state.guests = data.guests || [];
        document.getElementById('guest-count-badge').textContent = `(${data.total || state.guests.length})`;
        renderGuests();
      } catch(e) { showToast(e.message, 'error'); }
    }
    
    function setGuestEventFilter(f) {
      currentGuestEventFilter = f;
      document.querySelectorAll('#tab-guests .pill').forEach(el => el.classList.remove('active'));
      document.querySelector(`#tab-guests .pill[data-epill="${f}"]`).classList.add('active');
      renderGuests();
    }
    
    function handleGuestSearch() { renderGuests(); }
    
    function renderGuests() {
      const tbody = document.querySelector('#guests-table tbody');
      const search = document.getElementById('guest-search').value.toLowerCase();
      
      let filtered = state.guests.filter(g => {
        if (search && !g.name.toLowerCase().includes(search) && !(g.phone||'').includes(search)) return false;
        if (currentGuestEventFilter !== 'all') {
          try {
            const evts = JSON.parse(g.events || '[]');
            if (!evts.includes(currentGuestEventFilter)) return false;
          } catch(e) { return false; }
        }
        return true;
      });
      
      tbody.innerHTML = filtered.map(g => {
        let evts = []; try { evts = JSON.parse(g.events || '[]'); } catch(e){}
        const eBadge = evts.includes('engagement') ? '<span class="event-badge active">E</span>' : '<span class="event-badge">E</span>';
        const hBadge = evts.includes('haldi') ? '<span class="event-badge active">H</span>' : '<span class="event-badge">H</span>';
        const wBadge = evts.includes('wedding') ? '<span class="event-badge active">W</span>' : '<span class="event-badge">W</span>';
        const upDot = g.can_upload ? '<span class="dot green"></span>On' : '<span class="dot gray"></span>Off';
        
        return `<tr onclick="showGuestDetail('${g.id}')" style="cursor:pointer;">
          <td style="font-weight:500;">${g.name}</td>
          <td style="color:var(--text2);">${g.phone || '-'}</td>
          <td>${eBadge}${hBadge}${wBadge}</td>
          <td>${upDot}</td>
          <td>
            <button onclick="event.stopPropagation();editGuest('${g.id}')" style="font-size:16px;color:var(--text1);"><i class="ph ph-pencil-simple"></i></button>
            <button onclick="event.stopPropagation();deleteGuest('${g.id}')" style="font-size:16px;color:var(--red);margin-left:8px;"><i class="ph ph-trash"></i></button>
          </td>
        </tr>`;
      }).join('');
    }

    function showGuestDetail(id) {
      const g = state.guests.find(x => x.id == id);
      if (!g) return;
      let evts = []; try { evts = JSON.parse(g.events || '[]'); } catch(e) {}
      
      document.getElementById('gd-name').textContent = g.name;
      document.getElementById('gd-phone').textContent = g.phone || 'No phone';
      
      const evtNames = { engagement: 'Engagement', haldi: 'Haldi', wedding: 'Wedding' };
      document.getElementById('gd-events').innerHTML = evts.map(e => 
        `<span class="event-badge active">${evtNames[e] || e}</span>`
      ).join('') || '<span style="color:var(--text2)">None</span>';
      
      document.getElementById('gd-upload').innerHTML = g.can_upload 
        ? '<span class="gd-upload-on">● Yes</span>' 
        : '<span class="gd-upload-off">● No</span>';
      
      document.getElementById('gd-edit-btn').onclick = () => { closeGuestDetail(); editGuest(id); };
      document.getElementById('gd-delete-btn').onclick = () => { closeGuestDetail(); deleteGuest(id); };
      
      document.getElementById('guestDetailOverlay').classList.add('active');
    }

    function closeGuestDetail() {
      document.getElementById('guestDetailOverlay').classList.remove('active');
    }

    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(e, id) { if(e) e.stopPropagation(); document.getElementById(id).classList.remove('active'); }
    
    function openAddGuest() {
      document.getElementById('g-id').value = '';
      document.getElementById('g-name').value = '';
      document.getElementById('g-phone').value = '';
      document.getElementById('g-upload').checked = true;
      document.querySelectorAll('#guestModalOverlay .pill').forEach(p => p.classList.add('active'));
      document.getElementById('guestModalTitle').textContent = 'Add Guest';
      openModal('guestModalOverlay');
    }
    
    function editGuest(id) {
      const g = state.guests.find(x => x.id == id);
      if(!g) return;
      document.getElementById('g-id').value = g.id;
      document.getElementById('g-name').value = g.name;
      document.getElementById('g-phone').value = g.phone || '';
      document.getElementById('g-upload').checked = !!g.can_upload;
      let evts = []; try{ evts = JSON.parse(g.events||'[]'); }catch(e){}
      document.getElementById('ge-engagement').className = 'pill ' + (evts.includes('engagement')?'active':'');
      document.getElementById('ge-haldi').className = 'pill ' + (evts.includes('haldi')?'active':'');
      document.getElementById('ge-wedding').className = 'pill ' + (evts.includes('wedding')?'active':'');
      document.getElementById('guestModalTitle').textContent = 'Edit Guest';
      openModal('guestModalOverlay');
    }
    
    function toggleEventPill(btn) { btn.classList.toggle('active'); }
    
    async function saveGuest() {
      const id = document.getElementById('g-id').value;
      const name = document.getElementById('g-name').value;
      const phone = document.getElementById('g-phone').value;
      const can_upload = document.getElementById('g-upload').checked ? 1 : 0;
      const evts = [];
      if(document.getElementById('ge-engagement').classList.contains('active')) evts.push('engagement');
      if(document.getElementById('ge-haldi').classList.contains('active')) evts.push('haldi');
      if(document.getElementById('ge-wedding').classList.contains('active')) evts.push('wedding');
      
      if(!name) return showToast('Name is required', 'error');
      if(phone && phone.length !== 10) return showToast('Phone must be 10 digits', 'error');
      if(evts.length === 0) return showToast('Select at least one event', 'error');
      
      try {
        if(id) {
          await api('PUT', `/api/guests/${id}`, { name, phone, events: evts, can_upload });
          showToast('Guest updated');
        } else {
          await api('POST', `/api/guests`, { name, phone, events: evts, can_upload });
          showToast('Guest added');
        }
        closeModal(null, 'guestModalOverlay');
        loadGuests();
      } catch(e) { showToast(e.message, 'error'); }
    }
    
    async function deleteGuest(id) {
      if(!confirm('Delete this guest?')) return;
      try {
        await api('DELETE', `/api/guests/${id}`);
        showToast('Guest deleted');
        loadGuests();
      } catch(e) { showToast(e.message, 'error'); }
    }

    async function importGuests() {
       const text = document.getElementById('import-text').value;
       const lines = text.split('\n').map(l => l.trim()).filter(l => l);
       const toImport = [];
       for(let l of lines) {
         const parts = l.split(',');
         if(parts.length >= 2) {
           toImport.push({
             name: parts[0].trim(),
             phone: parts[1].trim(),
             events: parts[2] ? parts[2].split('|').map(s=>s.trim()) : ['engagement','haldi','wedding'],
             can_upload: parts[3] ? (parts[3].trim().toLowerCase()==='true'?1:0) : 1
           });
         }
       }
       if(!toImport.length) return showToast('No valid rows found', 'error');
       try {
         const res = await api('POST', '/api/guests/import', toImport);
         showToast(`Imported ${res.count} guests`);
         closeModal(null, 'importModalOverlay');
         loadGuests();
       } catch(e) { showToast(e.message, 'error'); }
    }

    async function loadReview() {
      try {
        const statuses = document.getElementById('review-status-filter').value;
        state.submissions = await api('GET', `/api/submissions?status=${statuses}`);
        renderReview();
      } catch(e) { showToast(e.message, 'error'); }
    }
    
    function renderReview() {
      const grid = document.getElementById('review-grid');
      const evtFilter = document.getElementById('review-event-filter').value;
      
      let filtered = state.submissions;
      if(evtFilter !== 'all') filtered = filtered.filter(s => s.event_tag === evtFilter);
      
      grid.innerHTML = filtered.map(s => {
        const isPending = s.status === 'pending';
        const isApp = s.status === 'approved';
        
        return `<div class="review-card">
          <div class="review-img" style="display:flex;align-items:center;justify-content:center;color:var(--text3);cursor:pointer;" onclick="openMedia('${s.id}')">
            <i class="ph ph-image" style="font-size:24px;margin-right:8px;"></i> Click to load image
          </div>
          <div class="review-info">
            <div class="review-row1"><span>${s.sender_name}</span> <span class="event-badge active">${s.event_tag}</span></div>
            <div class="review-row2">${s.sender_phone || 'No phone'}</div>
            <div class="review-row3">${new Date(s.received_at).toLocaleString()}</div>
          </div>
          <div class="review-actions">
            ${isPending ? `
              <button class="btn-reject" onclick="reviewAction('${s.id}', 'reject')">Reject</button>
              <button class="btn-approve" onclick="reviewAction('${s.id}', 'approve')">Approve</button>
            ` : (isApp ? `<div class="status-badge approved">Approved</div>` : `<div class="status-badge rejected">Rejected</div><button class="btn-outline" onclick="reviewAction('${s.id}','reset')">Reset</button>`)}
          </div>
        </div>`;
      }).join('');
    }
    
    async function reviewAction(id, action) {
      try {
        await api('POST', `/api/submissions/${id}/${action}`);
        showToast('Action successful');
        loadReview();
        loadOverview();
      } catch(e) { showToast(e.message, 'error'); }
    }

    async function openMedia(subId) {
      try {
        const res = await api('GET', `/api/submissions/${subId}/media-url`);
        const lb = document.getElementById('lightbox');
        document.getElementById('lb-img').src = res.url;
        document.getElementById('lb-info').textContent = 'Image preview';
        lb.classList.add('active');
      } catch(e) { showToast(e.message, 'error'); }
    }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('active'); document.getElementById('lb-img').src = ''; }

    async function loadGallery() {
      try {
        // use submissions with status approved for gallery
        state.gallery = await api('GET', `/api/submissions?status=approved`);
        renderGallery();
      } catch(e) { showToast(e.message, 'error'); }
    }
    
    function setGalleryFilter(epill) {
      document.querySelectorAll('#tab-gallery .pill').forEach(p => p.classList.remove('active'));
      document.querySelector(`#tab-gallery .pill[data-gfilter="${epill}"]`).classList.add('active');
      renderGallery(epill);
    }
    
    function renderGallery(filter = 'all') {
      const grid = document.getElementById('gallery-grid');
      let items = state.gallery;
      if(filter !== 'all') items = items.filter(i => i.event_tag === filter);
      if(!items.length) { grid.innerHTML = '<div style="color:var(--text2);padding:20px;"><i class="ph ph-image" style="margin-right:8px;"></i>No photos yet</div>'; return; }
      
      grid.innerHTML = items.map(i => {
         return `<div class="gallery-item" onclick="openMedia('${i.id}')">
           <div style="aspect-ratio:1;background:var(--surface2);display:flex;align-items:center;justify-content:center;color:var(--text3);"><i class="ph ph-image" style="font-size:24px;margin-right:8px;"></i> Image</div>
           <div class="gallery-attr">by ${i.sender_name}</div>
         </div>`;
      }).join('');
    }

    let uploadFiles = [];
    function handleFileSelect(e) {
      uploadFiles = Array.from(e.target.files);
      const list = document.getElementById('up-list');
      list.innerHTML = uploadFiles.map((f, i) => `
        <div class="file-item">
          <span>${f.name} (${(f.size/1024/1024).toFixed(2)} MB)</span>
          <span class="file-remove" onclick="removeUpload(${i})">&times;</span>
        </div>
      `).join('');
    }
    function removeUpload(idx) {
      uploadFiles.splice(idx, 1);
      handleFileSelect({ target: { files: uploadFiles }});
    }
    async function uploadManual() {
      const name = document.getElementById('up-name').value;
      const event = document.getElementById('up-event').value;
      if(!name || uploadFiles.length === 0) return showToast('Name and files required', 'error');
      
      let successCount = 0;
      for(let f of uploadFiles) {
        const formData = new FormData();
        formData.append('file', f);
        formData.append('senderName', name);
        formData.append('eventTag', event);
        
        try {
          const res = await fetch(API_BASE + '/api/upload-manual', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + state.token },
            body: formData
          });
          if(!res.ok) throw new Error('Upload failed');
          successCount++;
        } catch(e) { showToast(e.message, 'error'); }
      }
      showToast(`${successCount} photos added to gallery`);
      uploadFiles = [];
      document.getElementById('up-list').innerHTML = '';
      document.getElementById('up-name').value = '';
    }

    async function loadSettings() {
      try {
        const data = await api('GET', '/api/workspace');
        state.config = data.config || {};
        renderSettings();
      } catch(e) { showToast(e.message, 'error'); }
    }
    
    function renderSettings() {
      const c = state.config;
      const form = document.getElementById('settingsForm');
      form.innerHTML = `
        <div class="settings-section">
          <h2 class="settings-section-title">Couple & Family</h2>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Bride's Name (English)</label><input class="form-input" id="c-bn" value="${c.brideName||''}"></div>
            <div class="form-group"><label class="form-label">Bride's Name (Hindi)</label><input class="form-input" id="c-bnh" value="${c.brideNameHindi||''}"></div>
            <div class="form-group"><label class="form-label">Groom's Name (English)</label><input class="form-input" id="c-gn" value="${c.groomName||''}"></div>
            <div class="form-group"><label class="form-label">Groom's Name (Hindi)</label><input class="form-input" id="c-gnh" value="${c.groomNameHindi||''}"></div>
            <div class="form-group"><label class="form-label">Bride's Father</label><input class="form-input" id="c-bf" value="${c.brideFather||''}"></div>
            <div class="form-group"><label class="form-label">Bride's Mother</label><input class="form-input" id="c-bm" value="${c.brideMother||''}"></div>
            <div class="form-group"><label class="form-label">Groom's Father</label><input class="form-input" id="c-gf" value="${c.groomFather||''}"></div>
            <div class="form-group"><label class="form-label">Groom's Mother</label><input class="form-input" id="c-gm" value="${c.groomMother||''}"></div>
            <div class="form-group" style="grid-column: span 2;"><label class="form-label">WhatsApp Number</label><input class="form-input" id="c-wa" value="${c.whatsappNumber||''}"></div>
          </div>
        </div>
      `;

      // Render events editor
      const eventsEditor = document.getElementById('events-editor');
      eventsEditor.innerHTML = '';

      (state.config.events || []).forEach((event, idx) => {
        const card = document.createElement('div');
        card.className = 'event-editor-card';
        card.dataset.idx = idx;
        card.innerHTML = `
          <div class="event-editor-header">
            <span class="event-icon">${event.icon && event.icon.startsWith('ph-') ? `<i class="ph ${event.icon}"></i>` : (event.icon || '<i class="ph ph-calendar-blank"></i>')}</span>
            <span class="event-editor-title">${event.title}</span>
          </div>
          <div class="settings-grid">
            <div class="settings-field">
              <label class="field-label">TITLE (ENGLISH)</label>
              <input class="field-input" data-field="title"
                value="${event.title || ''}" placeholder="e.g. Engagement">
            </div>
            <div class="settings-field">
              <label class="field-label">TITLE (HINDI)</label>
              <input class="field-input" data-field="titleHindi"
                value="${event.titleHindi || ''}" placeholder="e.g. सगाई">
            </div>
            <div class="settings-field">
              <label class="field-label">DATE</label>
              <input class="field-input" type="date" data-field="date"
                value="${event.date || ''}">
            </div>
            <div class="settings-field">
              <label class="field-label">ICON (CLASS)</label>
              <input class="field-input" data-field="icon"
                value="${event.icon || ''}" placeholder="ph-heart" maxlength="30">
            </div>
            <div class="settings-field">
              <label class="field-label">TIME (ENGLISH)</label>
              <input class="field-input" data-field="time"
                value="${event.time || ''}" placeholder="e.g. 7 PM Onwards">
            </div>
            <div class="settings-field">
              <label class="field-label">TIME (HINDI)</label>
              <input class="field-input" data-field="timeHindi"
                value="${event.timeHindi || ''}" placeholder="e.g. शाम 7 बजे से">
            </div>
            <div class="settings-field">
              <label class="field-label">VENUE NAME (ENGLISH)</label>
              <input class="field-input" data-field="venueName"
                value="${event.venueName || ''}" placeholder="Venue name">
            </div>
            <div class="settings-field">
              <label class="field-label">VENUE NAME (HINDI)</label>
              <input class="field-input" data-field="venueNameHindi"
                value="${event.venueNameHindi || ''}" placeholder="स्थान का नाम">
            </div>
            <div class="settings-field full-width">
              <label class="field-label">VENUE ADDRESS (ENGLISH)</label>
              <input class="field-input" data-field="venueAddress"
                value="${event.venueAddress || ''}"
                placeholder="Full address">
            </div>
            <div class="settings-field full-width">
              <label class="field-label">VENUE ADDRESS (HINDI)</label>
              <input class="field-input" data-field="venueAddressHindi"
                value="${event.venueAddressHindi || ''}"
                placeholder="पूरा पता">
            </div>
            <div class="settings-field full-width">
              <label class="field-label">GOOGLE MAPS URL</label>
              <input class="field-input" data-field="mapUrl"
                value="${event.mapUrl || ''}"
                placeholder="https://maps.app.goo.gl/...">
            </div>
          </div>
        `;
        eventsEditor.appendChild(card);
      });
    }
    
    async function saveSettings() {
      const config = {
        ...state.config,
        brideName: document.getElementById('c-bn').value,
        brideNameHindi: document.getElementById('c-bnh').value,
        groomName: document.getElementById('c-gn').value,
        groomNameHindi: document.getElementById('c-gnh').value,
        brideFather: document.getElementById('c-bf').value,
        brideMother: document.getElementById('c-bm').value,
        groomFather: document.getElementById('c-gf').value,
        groomMother: document.getElementById('c-gm').value,
        whatsappNumber: document.getElementById('c-wa').value
      };

      // Collect updated event values from editor cards
      const eventCards = document.querySelectorAll('.event-editor-card');
      const updatedEvents = Array.from(eventCards).map((card, idx) => {
        const original = state.config.events[idx] || {};
        const inputs = card.querySelectorAll('[data-field]');
        const updated = { ...original };
        inputs.forEach(input => {
          updated[input.dataset.field] = input.value.trim();
        });
        return updated;
      });
      // Merge into config before saving
      config.events = updatedEvents;

      try {
        await api('PUT', '/api/workspace', { config });
        state.config = config;
        showToast('Settings saved');
      } catch(e) { showToast('Failed to save', 'error'); }
    }

    // --- Configuration Tab Methods ---
    async function loadConfig() {
      try {
        const data = await api('GET', '/api/config');
        state.configItems = data.configs || [];
        renderConfig();
        updateStatusPills();
      } catch(e) {
        showToast('Failed to load configurations', 'error');
      }
    }

    function renderConfig() {
      const categories = ['system', 'whatsapp', 'telegram', 'storage', 'payments'];
      categories.forEach(cat => {
        const container = document.getElementById(`config-list-${cat}`);
        if (!container) return;
        
        const items = state.configItems.filter(item => item.category === cat);
        container.innerHTML = items.map(item => `
          <div class="config-row">
            <label class="config-label" title="${item.key}">${item.label}</label>
            <div class="config-input-wrap">
              <input type="${item.isSecret ? 'password' : 'text'}" 
                     class="config-input ${item.isSecret ? 'is-secret' : ''}" 
                     value="${item.value}" 
                     data-config-key="${item.key}"
                     placeholder="${item.isEmpty ? 'Not configured' : ''}">
              ${item.isSecret ? `<button class="eye-btn" onclick="toggleSecret(this)"><i class="ph ph-eye"></i></button>` : ''}
            </div>
            <div style="font-size:11px; color:var(--text2); margin-top:4px;">${item.description}</div>
          </div>
        `).join('');
      });
    }

    function toggleSecret(btn) {
      const input = btn.previousElementSibling;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ph ph-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'ph ph-eye';
      }
    }

    async function saveConfig() {
      const inputs = document.querySelectorAll('input[data-config-key]');
      const updates = [];
      let hasChanges = false;

      inputs.forEach(input => {
        const key = input.dataset.configKey;
        const value = input.value;
        const originalItem = state.configItems.find(item => item.key === key);
        
        if (originalItem && value !== originalItem.value && value !== '••••••••') {
          updates.push({ key, value });
          hasChanges = true;
          originalItem.value = value;
          originalItem.isEmpty = value.trim() === '';
        }
      });

      if (!hasChanges) {
        showToast('No changes to save');
        return;
      }

      try {
        await api('PUT', '/api/config', { updates });
        showToast('Configurations saved cleanly');
        updateStatusPills();
      } catch(e) {
        showToast('Failed to save configurations', 'error');
      }
    }

    function updateStatusPills() {
      const waItem = state.configItems.find(i => i.key === 'whatsapp_number');
      const waStatus = document.getElementById('wa-status');
      if (waStatus) {
        if (waItem && waItem.value && waItem.value !== '••••••••' && !waItem.isEmpty) {
          waStatus.className = 'config-status status-ok';
          waStatus.textContent = 'Active';
        } else {
          waStatus.className = 'config-status status-warn';
          waStatus.textContent = 'Not Set';
        }
      }

      const tgToken = state.configItems.find(i => i.key === 'telegram_bot_token');
      const tgStatus = document.getElementById('tg-status');
      if (tgStatus) {
        if (tgToken && tgToken.value && tgToken.value !== '••••••••' && !tgToken.isEmpty) {
          tgStatus.className = 'config-status status-ok';
          tgStatus.textContent = 'Active';
        } else {
          tgStatus.className = 'config-status status-warn';
          tgStatus.textContent = 'Missing Token';
        }
      }
    }