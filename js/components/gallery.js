/* ============================================
   AS WEDDING — Gallery Component
   Photo gallery + upload logic
   ============================================ */

async function loadGallery(eventKey) {
  const container = document.getElementById(`gallery-${eventKey}`);
  if (!container) return;

  const photos = await getPhotos(eventKey);

  if (photos.length === 0) {
    container.innerHTML = `
      <div class="gallery-empty">
        <div class="gallery-empty-icon">📷</div>
        <p>${t('galleryEmpty')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = photos.map(photo => {
    const attribution = photo.source === 'whatsapp' && photo.uploadedBy
      ? `<span class="gallery-attribution">${t('sharedBy') || 'Shared by'} ${photo.uploadedBy}</span>`
      : '';
    return `
    <div class="gallery-item loading" onclick="openLightbox('${photo.url}')">
      <img
        src="${photo.url}"
        alt="Photo by ${photo.uploadedBy}"
        loading="lazy"
        onload="this.parentElement.classList.remove('loading'); this.parentElement.classList.add('loaded');"
        onerror="this.parentElement.style.display='none';"
      >
      ${attribution}
    </div>
  `;
  }).join('');
}

async function handleUploadClick(eventKey) {
  const phone = sessionStorage.getItem('guest_phone');

  if (!phone) {
    showToast(t('phoneErrorNotFound'), true);
    return;
  }

  // Check permission
  const canUpload = sessionStorage.getItem('guest_can_upload') === 'true';

  if (!canUpload) {
    // Double check from Firestore
    const hasPermission = await checkUploadPermission(phone);
    if (!hasPermission) {
      showToast(t('uploadNotAllowed'), true);
      return;
    }
  }

  // Open file picker
  const fileInput = document.getElementById(`file-input-${eventKey}`);
  if (fileInput) {
    fileInput.click();
  }
}

async function handleFileSelected(event, eventKey) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const phone = sessionStorage.getItem('guest_phone');
  if (!phone) return;

  const progressContainer = document.getElementById(`upload-progress-${eventKey}`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast(`File "${file.name}" is too large (max 50MB)`, true);
      continue;
    }

    // Show progress
    if (progressContainer) {
      progressContainer.innerHTML = `
        <div style="text-align: center; margin-top: var(--space-sm); font-size: var(--fs-xs); color: var(--text-light);">
          Uploading ${i + 1}/${files.length}...
        </div>
        <div class="upload-progress">
          <div class="upload-progress-bar" style="width: 50%;"></div>
        </div>
      `;
    }

    const url = await uploadPhoto(file, eventKey, phone);

    if (url) {
      // Update progress bar
      if (progressContainer) {
        const bar = progressContainer.querySelector('.upload-progress-bar');
        if (bar) bar.style.width = '100%';
      }
    }
  }

  // Clear progress and show success
  if (progressContainer) {
    progressContainer.innerHTML = '';
  }

  showToast(t('uploadSuccess'));

  // Reload gallery
  await loadGallery(eventKey);

  // Reset file input
  event.target.value = '';
}
