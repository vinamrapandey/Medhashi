/* ============================================
   AS WEDDING — Main App Controller
   Screen routing, transitions, navigation
   ============================================ */

let currentScreen = null;
let currentEvent = null;

/* ---- Toast System ---- */
function showToast(message, isError = false, duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ---- Hide All Screens ---- */
function hideAllScreens() {
    document.querySelectorAll('.app-container > .screen').forEach(s => {
        s.classList.remove('active', 'fade-in', 'fade-out');
    });
}

/* ---- Guest Sign Out ---- */
function guestSignOut() {
    sessionStorage.clear();
    localStorage.removeItem('as_wedding_lang');
    navigateTo('screen-language');
}

/* ---- Screen Navigation ---- */
function navigateTo(screenId, options = {}) {
    const { skipLoader = false, eventKey = null } = options;

    if (eventKey) {
        currentEvent = eventKey;
    }

    const doTransition = () => {
        hideAllScreens();

        // Initialize screen content
        initScreen(screenId);

        const newScreen = document.getElementById(screenId);
        if (newScreen) {
            newScreen.classList.add('active');
            void newScreen.offsetHeight;
            newScreen.classList.add('fade-in');
        }

        currentScreen = screenId;

        // Scroll to top
        const container = document.querySelector('.app-container');
        if (container) container.scrollTop = 0;

        // Show/hide language toggle and back arrow
        updateNav(screenId);
    };

    if (skipLoader) {
        doTransition();
    } else {
        showLoader();
        hideLoader(600).then(doTransition);
    }
}

/* ---- Update Navigation (back arrow, lang toggle) ---- */
function updateNav(screenId) {
    const backArrow = document.getElementById('back-arrow');
    const langToggle = document.getElementById('lang-toggle');

    // Back arrow — show on event detail and events page
    if (backArrow) {
        if (screenId === 'screen-event-detail') {
            backArrow.style.display = 'flex';
            backArrow.onclick = () => {
                clearAllCountdowns();
                navigateTo('screen-events');
            };
        } else if (screenId === 'screen-events') {
            backArrow.style.display = 'flex';
            backArrow.onclick = () => {
                navigateTo('screen-story', { skipLoader: true });
            };
        } else {
            backArrow.style.display = 'none';
        }
    }

    // Language toggle — show on events and event detail only (not during story)
    if (langToggle) {
        if (screenId === 'screen-events' || screenId === 'screen-event-detail') {
            langToggle.style.display = 'block';
            langToggle.textContent = t('langToggleLabel');
        } else {
            langToggle.style.display = 'none';
        }
    }
}

/* ---- Initialize Screen Content ---- */
function initScreen(screenId) {
    switch (screenId) {
        case 'screen-language':
            renderLanguageScreen();
            break;
        case 'screen-phone':
            renderPhoneScreen();
            break;
        case 'screen-story':
            renderStoryScreen();
            break;
        case 'screen-events':
            clearAllCountdowns();
            renderEventsScreen();
            break;
        case 'screen-event-detail':
            renderEventDetailScreen(currentEvent);
            break;
    }
}

/* ---- Language Toggle Handler ---- */
function toggleLanguage() {
    const current = getLang();
    const newLang = current === 'en' ? 'hi' : 'en';
    setLang(newLang);

    // Re-render current screen
    if (currentScreen === 'screen-story') {
        cleanupStory();
        renderStoryScreen();
    } else if (currentScreen === 'screen-events') {
        clearAllCountdowns();
        renderEventsScreen();
    } else if (currentScreen === 'screen-event-detail') {
        clearAllCountdowns();
        renderEventDetailScreen(currentEvent);
    } else if (currentScreen) {
        initScreen(currentScreen);
    }

    updateNav(currentScreen);
}

/* ---- App Initialization ---- */
function initApp() {
    // Initialize Firebase
    initFirebase();

    // Sync live config from API (non-blocking)
    if (typeof syncWorkspaceConfig === 'function') {
      syncWorkspaceConfig()
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Silent fail for local dev
        });
    }

    // Set up lang toggle
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }

    // Determine starting screen
    const savedLang = getLang();
    if (!savedLang) {
        navigateTo('screen-language');
    } else {
        const guestPhone = sessionStorage.getItem('guest_phone');
        if (guestPhone) {
            navigateTo('screen-story');
        } else {
            navigateTo('screen-phone');
        }
    }
}

/* ---- Start the app when DOM is ready ---- */
document.addEventListener('DOMContentLoaded', initApp);
