/* ============================================
   AS WEDDING — Story Onboarding
   3 slides: Welcome, Medhashi, Events
   Auto-advance, tap/swipe, progress bars
   ============================================ */

/* ============================================
   AS WEDDING — Story Onboarding (Manual Flow)
   3 slides: Medhashi, Invitation, Events
   Manual advance, tap/swipe, horizontal slides
   ============================================ */

let storyCurrentSlide = 0;
const storySlideCount = 3;

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

    <!-- Slide 1: Medhashi Definition -->
    <div class="story-slide slide-medhashi active" id="story-slide-0">
      <div class="medhashi-card">
        <div class="medhashi-word" id="medhashi-typewriter"></div>
        <div class="medhashi-pronunciation" id="medhashi-pron">/medhāśi/</div>
        <div class="medhashi-divider" id="medhashi-div"></div>
        <div class="medhashi-type" id="medhashi-type">noun  •  proper</div>
        <div class="medhashi-def" id="medhashi-def1">
          <span class="def-num">1.</span> The union of two souls — Medha (अपूर्वा) and Rishi (सौम्य), whose love gave birth to a name, and a new family.
        </div>
        <div class="medhashi-def-hi" id="medhashi-def2">
          <span class="def-num">2.</span> मेधा + ऋषि = मेधाशी<br>
          दो नामों का संगम, एक नई कहानी की शुरुआत।
        </div>
        <div class="medhashi-site" id="medhashi-site">✦ medhashi.com</div>
      </div>
    </div>

    <!-- Slide 2: Invitation -->
    <div class="story-slide slide-invitation" id="story-slide-1">
      <div class="invite-card" id="invite-card">
        <div class="floral-ornament floral-ornament-sm" style="margin: 0 auto 12px; opacity: 0;" id="inv-el-0"></div>
        
        <div class="invite-blessings" id="inv-el-1">— with the blessings of —</div>
        
        <div class="invite-parents-row" id="inv-el-2">
          <div class="invite-parents-col">
            Shri Vinod Kumar Pandey<br>
            & Smt. Madhu Pandey
          </div>
          <div class="invite-parents-ampersand">&</div>
          <div class="invite-parents-col">
            Shri Rajarshi Dwivedy<br>
            & Smt. Aprajita Dwivedy
          </div>
        </div>

        <div class="invite-divider" id="inv-el-3"></div>

        <div class="invite-together" id="inv-el-4">Together with their families</div>

        <div class="invite-names" id="inv-el-5">Apoorva & Saumya</div>
        <div class="invite-names-hi" id="inv-el-6">अपूर्वा & सौम्य</div>

        <div class="invite-request" id="inv-el-7">
          request the honour of your presence<br>
          as they begin their forever
        </div>

        <div class="invite-divider" id="inv-el-8" style="width: 40px; background: #B58A8A;"></div>

        <div class="invite-date-location" id="inv-el-9">
          ✦ April 23 – 27, 2026 ✦<br>
          Lucknow, Uttar Pradesh
        </div>

        <div class="floral-ornament floral-ornament-sm" style="margin: 0 auto; transform: scaleY(-1); opacity: 0;" id="inv-el-10"></div>
      </div>
    </div>

    <!-- Slide 3: Video -->
    <div class="story-slide slide-video" id="story-slide-2">
      <div id="story-video-container">
        <!-- Loader shown while video buffers -->
        <div id="couple-video-loader" class="monogram-loader">
          <span>A ✦ S</span>
        </div>
        <!-- Main video -->
        <video
          id="coupleVideo"
          playsinline
          muted
          preload="metadata"
          poster="assets/video/couple-poster.png">
          <source src="assets/video/couple-animation.mp4" type="video/mp4">
        </video>
      </div>
    </div>

    <!-- Global Skip button -->
    <button id="story-skip-btn" onclick="exitStory()">Skip &rarr;</button>

    <!-- Nav controls -->
    <button class="story-nav story-nav-prev hidden" id="story-prev" onclick="storyPrev()">‹</button>
    <button class="story-nav story-nav-next" id="story-next" onclick="storyNext()">›</button>
    <button class="story-nav-begin" id="story-begin" onclick="exitStory()">
      ${isHindi ? 'शुरू करें →' : "Let's Begin →"}
    </button>

    <!-- Progress bars -->
    <div class="story-progress" id="story-progress">
      <div class="story-progress-bar"><div class="story-progress-fill filled" id="story-fill-0"></div></div>
      <div class="story-progress-bar"><div class="story-progress-fill" id="story-fill-1"></div></div>
      <div class="story-progress-bar"><div class="story-progress-fill" id="story-fill-2"></div></div>
    </div>
  </div>
  `;

  storyCurrentSlide = 0;
  initStoryControls();
  goToSlide(0); // initialize states
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

  // Video and Loading logic
  const video = document.getElementById('coupleVideo');
  const loader = document.getElementById('couple-video-loader');
  
  if (video && loader) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlow = connection && ['slow-2g', '2g'].includes(connection.effectiveType);

    if (isSlow) {
      // Don't auto-handle buffering issues. Just hide loader.
      loader.style.display = 'none';
      return; 
    }

    const fallbackTimer = setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }, 6000);

    video.addEventListener('canplay', () => {
        clearTimeout(fallbackTimer);
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    });

    video.addEventListener('ended', () => {
        // Only automatically proceed if user wants it, or we leave them.
        setTimeout(exitStory, 500); 
    });
  }
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
  // Determine direction for slide classes
  const isForward = idx > storyCurrentSlide;

  // Update progress bars (instant fill solid)
  for (let i = 0; i < storySlideCount; i++) {
    const fill = document.getElementById(`story-fill-${i}`);
    if (!fill) continue;
    if (i <= idx) {
      fill.classList.add('filled');
    } else {
      fill.classList.remove('filled');
    }
  }

  // Horizontal sliding classes
  for (let i = 0; i < storySlideCount; i++) {
    const slide = document.getElementById(`story-slide-${i}`);
    if (!slide) continue;

    slide.classList.remove('active', 'prev');

    if (i < idx) {
      slide.classList.add('prev'); // Move to left
    } else if (i === idx) {
      slide.classList.add('active'); // Center
    }
    // i > idx naturally removes prev/active, falling back to default translateX(100%) (right)
  }

  // Update nav buttons
  const prevBtn = document.getElementById('story-prev');
  const nextBtn = document.getElementById('story-next');
  const beginBtn = document.getElementById('story-begin');

  if (idx === 0) {
    prevBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    beginBtn.style.display = 'none';
    runTypewriter();
  } else if (idx === 1) {
    prevBtn.classList.remove('hidden');
    nextBtn.classList.remove('hidden');
    beginBtn.style.display = 'none';
    runInvitationAnimation();
  } else if (idx === 2) {
    prevBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    beginBtn.style.display = 'block';
  }

  // Handle video play/pause
  const video = document.getElementById('coupleVideo');
  if (video) {
    if (idx === 2) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  storyCurrentSlide = idx;
}

/* ==================== ANIMATIONS ==================== */
function runTypewriter() {
  const el = document.getElementById('medhashi-typewriter');
  if (!el || el.dataset.typed === "true") return;

  el.dataset.typed = "true";
  const word = 'MEDHASHI';
  el.innerHTML = '<span class="typewriter-cursor"></span>';
  let i = 0;

  const typeInterval = setInterval(() => {
    if (i < word.length) {
      el.innerHTML = word.substring(0, i + 1) + '<span class="typewriter-cursor"></span>';
      i++;
    } else {
      clearInterval(typeInterval);
      setTimeout(() => {
        el.textContent = word;
        fadeInDefinition();
      }, 400);
    }
  }, 80);
}

function fadeInDefinition() {
  const ids = ['medhashi-pron', 'medhashi-div', 'medhashi-type', 'medhashi-def1', 'medhashi-def2', 'medhashi-site'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => el.classList.add('fade-in-def'), i * 200);
    }
  });
}

function runInvitationAnimation() {
  const card = document.getElementById('invite-card');
  if (!card || card.dataset.animated === "true") return;
  card.dataset.animated = "true";

  for (let i = 0; i <= 10; i++) {
    const el = document.getElementById(`inv-el-${i}`);
    if (el) {
      setTimeout(() => el.classList.add('invite-fade-in'), i * 150 + 200);
    }
  }
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
  document.removeEventListener('keydown', handleStoryKey);
}
