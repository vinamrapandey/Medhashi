/* ============================================
   AS WEDDING — Story Onboarding
   3 slides: Welcome, Medhashi, Events
   Auto-advance, tap/swipe, progress bars
   ============================================ */

let storyTimer = null;
let storyCurrentSlide = 0;
let storySlideCount = 3;
const SLIDE_DURATIONS = [6000, 6000, 10000]; // ms per slide

function renderStoryScreen() {
    const screen = document.getElementById('screen-story');
    if (!screen) return;

    const lang = getLang() || 'en';
    const isHindi = lang === 'hi';
    const events = STRINGS.events;

    screen.innerHTML = `
  <div class="story-container" id="story-container">

    <!-- Tap zones -->
    <div class="story-tap-left" id="story-tap-left"></div>
    <div class="story-tap-right" id="story-tap-right"></div>

    <!-- Slide 1: Welcome -->
    <div class="story-slide slide-welcome active" id="story-slide-0">
      <svg class="bloom-svg" viewBox="0 0 430 760" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bloomGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#C9A84C;stop-opacity:0.25"/>
            <stop offset="100%" style="stop-color:#C9A4A0;stop-opacity:0"/>
          </radialGradient>
        </defs>
        <circle cx="215" cy="380" r="300" fill="url(#bloomGrad)"/>
        <g opacity="0.12" fill="#C9A84C">
          <ellipse cx="215" cy="340" rx="60" ry="20" transform="rotate(0 215 340)"/>
          <ellipse cx="215" cy="340" rx="60" ry="20" transform="rotate(45 215 340)"/>
          <ellipse cx="215" cy="340" rx="60" ry="20" transform="rotate(90 215 340)"/>
          <ellipse cx="215" cy="340" rx="60" ry="20" transform="rotate(135 215 340)"/>
        </g>
        <g opacity="0.08" fill="#C9A4A0">
          <ellipse cx="215" cy="340" rx="90" ry="28" transform="rotate(22 215 340)"/>
          <ellipse cx="215" cy="340" rx="90" ry="28" transform="rotate(67 215 340)"/>
          <ellipse cx="215" cy="340" rx="90" ry="28" transform="rotate(112 215 340)"/>
          <ellipse cx="215" cy="340" rx="90" ry="28" transform="rotate(157 215 340)"/>
        </g>
        <circle cx="215" cy="340" r="8" fill="#C9A84C" opacity="0.2"/>
        <circle cx="215" cy="340" r="120" fill="none" stroke="#C9A84C" stroke-width="0.5" opacity="0.1" stroke-dasharray="3 8"/>
      </svg>

      <p class="story-small-text ${isHindi ? 'text-hindi' : ''}">${t('storyWelcomeSmall')}</p>
      <h1 class="story-heading ${isHindi ? 'text-hindi' : ''}">${t('storyWelcomeHeading')}</h1>
      <p class="story-body ${isHindi ? 'text-hindi' : ''}">${t('storyWelcomeBody')}</p>
      <div class="story-monogram">A ✦ S</div>
    </div>

    <!-- Slide 2: Medhashi Definition -->
    <div class="story-slide slide-medhashi" id="story-slide-1">
      <div class="medhashi-card">
        <div class="medhashi-word" id="medhashi-typewriter"></div>
        <div class="medhashi-pronunciation" id="medhashi-pron">/medhāśi/</div>
        <div class="medhashi-divider" id="medhashi-div"></div>
        <div class="medhashi-type" id="medhashi-type">noun  •  proper</div>
        <div class="medhashi-def" id="medhashi-def1">
          <span class="def-num">1.</span> The union of two souls, Medha (अपूर्वा) & Rishi (सौम्य), whose love gave birth to a name — and a new family.
        </div>
        <div class="medhashi-def-hi" id="medhashi-def2">
          <span class="def-num">2.</span> मेधा + ऋषि = मेधाशी<br>
          दो नामों का संगम, एक नई कहानी की शुरुआत।
        </div>
        <div class="medhashi-site" id="medhashi-site">✦ medhashi.com</div>
      </div>
    </div>

    <!-- Slide 3: Events -->
    <div class="story-slide slide-events" id="story-slide-2">
      <h2 class="story-events-heading ${isHindi ? 'text-hindi' : ''}">${t('storyCelebrations')}</h2>
      <div class="story-event-cards">
        <div class="story-event-card story-event-card-engagement" onclick="storyOpenEvent('engagement')">
          <div class="story-event-icon">${events.engagement.icon}</div>
          <div class="story-event-info">
            <div class="story-event-title ${isHindi ? 'text-hindi' : ''}">${events.engagement.title[lang]}</div>
            <div class="story-event-date ${isHindi ? 'text-hindi' : ''}">${events.engagement.dateFormatted[lang]}</div>
          </div>
          <span class="story-event-arrow">→</span>
        </div>
        <div class="story-event-card story-event-card-haldi" onclick="storyOpenEvent('haldi')">
          <div class="story-event-icon">${events.haldi.icon}</div>
          <div class="story-event-info">
            <div class="story-event-title ${isHindi ? 'text-hindi' : ''}">${events.haldi.title[lang]}</div>
            <div class="story-event-date ${isHindi ? 'text-hindi' : ''}">${events.haldi.dateFormatted[lang]}</div>
          </div>
          <span class="story-event-arrow">→</span>
        </div>
        <div class="story-event-card story-event-card-wedding" onclick="storyOpenEvent('wedding')">
          <div class="story-event-icon">${events.wedding.icon}</div>
          <div class="story-event-info">
            <div class="story-event-title ${isHindi ? 'text-hindi' : ''}">${events.wedding.title[lang]}</div>
            <div class="story-event-date ${isHindi ? 'text-hindi' : ''}">${events.wedding.dateFormatted[lang]}</div>
          </div>
          <span class="story-event-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- Nav arrows -->
    <button class="story-nav story-nav-prev" id="story-prev" onclick="storyPrev()">‹</button>
    <button class="story-nav story-nav-next" id="story-next" onclick="storyNext()">›</button>

    <!-- Progress bars -->
    <div class="story-progress" id="story-progress">
      <div class="story-progress-bar"><div class="story-progress-fill" id="story-fill-0"></div></div>
      <div class="story-progress-bar"><div class="story-progress-fill" id="story-fill-1"></div></div>
      <div class="story-progress-bar"><div class="story-progress-fill" id="story-fill-2"></div></div>
    </div>
  </div>
  `;

    storyCurrentSlide = 0;
    initStoryControls();
    startSlide(0);
}

/* ==================== CONTROLS ==================== */
function initStoryControls() {
    const container = document.getElementById('story-container');
    if (!container) return;

    // Tap zones
    document.getElementById('story-tap-left').addEventListener('click', storyPrev);
    document.getElementById('story-tap-right').addEventListener('click', storyNext);

    // Swipe
    let startX = 0;
    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) {
            if (dx < 0) storyNext();
            else storyPrev();
        }
    });

    // Keyboard
    document.addEventListener('keydown', handleStoryKey);
}

function handleStoryKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') storyNext();
    if (e.key === 'ArrowLeft') storyPrev();
}

/* ==================== NAVIGATION ==================== */
function storyNext() {
    if (storyCurrentSlide < storySlideCount - 1) {
        goToSlide(storyCurrentSlide + 1);
    } else {
        exitStory();
    }
}

function storyPrev() {
    if (storyCurrentSlide > 0) {
        goToSlide(storyCurrentSlide - 1);
    }
}

function goToSlide(idx) {
    clearTimeout(storyTimer);

    // Mark completed fills
    for (let i = 0; i < storySlideCount; i++) {
        const fill = document.getElementById(`story-fill-${i}`);
        if (!fill) continue;
        fill.classList.remove('filling');
        if (i < idx) {
            fill.classList.add('done');
            fill.style.width = '100%';
        } else {
            fill.classList.remove('done');
            fill.style.width = '0%';
        }
    }

    // Switch slide visibility
    for (let i = 0; i < storySlideCount; i++) {
        const slide = document.getElementById(`story-slide-${i}`);
        if (slide) slide.classList.toggle('active', i === idx);
    }

    storyCurrentSlide = idx;
    startSlide(idx);
}

function startSlide(idx) {
    const fill = document.getElementById(`story-fill-${idx}`);
    if (!fill) return;

    const duration = SLIDE_DURATIONS[idx];

    // Reset fill
    fill.classList.remove('filling', 'done');
    fill.style.width = '0%';
    fill.style.transitionDuration = '';

    // Force reflow then start fill animation
    void fill.offsetWidth;
    fill.style.transitionDuration = `${duration}ms`;
    fill.classList.add('filling');
    fill.style.width = '100%';

    // Run slide-specific animations
    if (idx === 1) runTypewriter();

    // Auto-advance
    storyTimer = setTimeout(() => {
        fill.classList.remove('filling');
        fill.classList.add('done');

        if (idx < storySlideCount - 1) {
            goToSlide(idx + 1);
        } else {
            exitStory();
        }
    }, duration);
}

/* ==================== TYPEWRITER (Slide 2) ==================== */
function runTypewriter() {
    const el = document.getElementById('medhashi-typewriter');
    if (!el) return;

    const word = 'MEDHASHI';
    el.innerHTML = '<span class="typewriter-cursor"></span>';
    let i = 0;
    const interval = 100; // 800ms total for 8 chars

    const typeInterval = setInterval(() => {
        if (i < word.length) {
            el.innerHTML = word.substring(0, i + 1) + '<span class="typewriter-cursor"></span>';
            i++;
        } else {
            clearInterval(typeInterval);
            // Remove cursor after a beat
            setTimeout(() => {
                el.textContent = word;
                // Fade in rest of card
                fadeInDefinition();
            }, 400);
        }
    }, interval);
}

function fadeInDefinition() {
    const ids = ['medhashi-pron', 'medhashi-div', 'medhashi-type', 'medhashi-def1', 'medhashi-def2', 'medhashi-site'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
            setTimeout(() => el.classList.add('fade-in-def'), i * 150);
        }
    });
}

/* ==================== EXIT ==================== */
function exitStory() {
    cleanupStory();
    navigateTo('screen-events', { skipLoader: true });
}

function storyOpenEvent(eventKey) {
    cleanupStory();
    clearAllCountdowns();
    navigateTo('screen-event-detail', { eventKey });
}

function cleanupStory() {
    clearTimeout(storyTimer);
    storyTimer = null;
    document.removeEventListener('keydown', handleStoryKey);
}
