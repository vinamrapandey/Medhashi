/* ============================================
   AS WEDDING — Language Toggle Component
   ============================================ */

// Language toggle is initialized in app.js
// This file provides the rendering helper

function renderLangToggle() {
    const toggle = document.getElementById('lang-toggle');
    if (!toggle) return;

    const currentLang = getLang();
    toggle.textContent = currentLang === 'en' ? 'हिं' : 'EN';
    toggle.title = currentLang === 'en' ? 'Switch to Hindi' : 'Switch to English';
}
