/* ============================================
   AS WEDDING — Lightbox Component
   Full-screen image viewer
   ============================================ */

let currentLightboxUrl = '';

function openLightbox(url) {
    const overlay = document.getElementById('lightbox-overlay');
    const image = document.getElementById('lightbox-image');

    if (!overlay || !image) return;

    currentLightboxUrl = url;
    image.src = url;
    overlay.classList.add('active');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    currentLightboxUrl = '';

    // Restore body scroll
    document.body.style.overflow = '';
}

function downloadLightboxImage() {
    if (!currentLightboxUrl) return;

    const a = document.createElement('a');
    a.href = currentLightboxUrl;
    a.download = `AS_Wedding_Photo_${Date.now()}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Initialize lightbox event listeners
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('lightbox-close');
    const downloadBtn = document.getElementById('lightbox-download');
    const overlay = document.getElementById('lightbox-overlay');

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadLightboxImage);

    // Close on backdrop click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('lightbox-image-container')) {
                closeLightbox();
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });
});
