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

/* ---- Screen Navigation ---- */
function navigateTo(screenId, options = {}) {
    const { skipLoader = false, eventKey = null } = options;

    if (eventKey) {
        currentEvent = eventKey;
    }

    const doTransition = () => {
        // Hide all top-level screens
        hideAllScreens();

        if (screenId === 'screen-main-flow') {
            // Main flow: show the parent container and render all child sections
            const mainFlow = document.getElementById('screen-main-flow');
            if (mainFlow) {
                mainFlow.classList.add('active');
                void mainFlow.offsetHeight;
                mainFlow.classList.add('fade-in');
            }

            initMainFlow();
            currentScreen = 'screen-main-flow';
        } else {
            // Single screen
            initScreen(screenId);

            const newScreen = document.getElementById(screenId);
            if (newScreen) {
                newScreen.classList.add('active');
                void newScreen.offsetHeight;
                newScreen.classList.add('fade-in');
            }

            currentScreen = screenId;
        }

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

    // Back arrow — show only on event detail pages
    if (backArrow) {
        backArrow.style.display = (screenId === 'screen-event-detail') ? 'flex' : 'none';
    }

    // Language toggle — show on all screens except screen 0
    if (langToggle) {
        if (screenId === 'screen-language') {
            langToggle.style.display = 'none';
        } else {
            langToggle.style.display = 'block';
            langToggle.textContent = t('langToggleLabel');
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
    if (currentScreen === 'screen-main-flow') {
        // Re-render all sections in main flow
        clearAllCountdowns();
        renderHeroScreen();
        renderFamilyScreen();
        renderMessageScreen();
        renderEventsScreen();
    } else if (currentScreen === 'screen-event-detail') {
        clearAllCountdowns();
        renderEventDetailScreen(currentEvent);
    } else if (currentScreen) {
        initScreen(currentScreen);
    }

    updateNav(currentScreen);
}

/* ---- Main Flow (Screens 2-5 as scrollable sections) ---- */
function initMainFlow() {
    renderHeroScreen();
    renderFamilyScreen();
    renderMessageScreen();
    renderEventsScreen();

    // Mark child sections as visible (they are inside screen-main-flow)
    ['screen-hero', 'screen-family', 'screen-message', 'screen-events'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'flex';
            el.style.opacity = '1';
        }
    });
}

/* ---- App Initialization ---- */
function initApp() {
    // Initialize Firebase
    initFirebase();

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Silent fail for local dev
        });
    }

    // Set up navigation event listeners
    const backArrow = document.getElementById('back-arrow');
    if (backArrow) {
        backArrow.addEventListener('click', () => {
            clearAllCountdowns();
            navigateTo('screen-main-flow');
        });
    }

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
            navigateTo('screen-main-flow');
        } else {
            navigateTo('screen-phone');
        }
    }
}

/* ---- Start the app when DOM is ready ---- */
document.addEventListener('DOMContentLoaded', initApp);
