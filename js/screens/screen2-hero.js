/* ============================================
   AS WEDDING — Screen 2: Hero / Couple Page
   ============================================ */

function renderHeroScreen() {
    const screen = document.getElementById('screen-hero');
    if (!screen) return;

    const isHindi = getLang() === 'hi';

    screen.innerHTML = `
    <div class="hero-bg">
      <div class="hero-illustration" id="hero-illustration"></div>
      <div class="hero-bg-gradient"></div>
    </div>

    <div class="hero-content">
      <div class="monogram monogram-md" style="opacity:0; animation: fadeInUp 0.6s 0.2s var(--ease-smooth) forwards;">A ❋ S</div>

      <p class="hero-pre-text ${isHindi ? 'text-hindi' : ''}">${t('heroPreText')}</p>

      <h1 class="hero-couple-name ${isHindi ? 'text-hindi' : ''}">
        ${isHindi ? 'अपूर्वा' : 'Apoorva'} <span class="ampersand">&</span> ${isHindi ? 'सौम्य' : 'Saumya'}
      </h1>

      <p class="hero-post-text ${isHindi ? 'text-hindi' : ''}">${t('heroPostText')}</p>

      <div class="divider-gold" style="opacity:0; animation: fadeInUp 0.6s 2.4s var(--ease-smooth) forwards; width: 200px;">
        <span class="divider-gold-icon">✧</span>
      </div>
    </div>

    <div class="scroll-indicator">
      <span class="${isHindi ? 'text-hindi' : ''}" style="font-size: var(--fs-xs);">${t('scrollText')}</span>
      <span class="chevron">⌄</span>
    </div>
  `;

    // Create the hero illustration (floral frame with initials)
    createHeroIllustration();
}

function createHeroIllustration() {
    const container = document.getElementById('hero-illustration');
    if (!container) return;

    container.innerHTML = `
    <svg viewBox="0 0 430 760" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;position:absolute;inset:0;">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" style="stop-color:#FAF7F2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#F5EFE6;stop-opacity:1" />
        </radialGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#C9A84C;stop-opacity:0.6" />
          <stop offset="50%" style="stop-color:#E8D5A3;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#C9A84C;stop-opacity:0.6" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="430" height="760" fill="url(#bgGrad)" />

      <!-- Decorative Mughal Arch -->
      <path d="M 80 500 Q 80 200 215 140 Q 350 200 350 500"
            fill="none" stroke="url(#goldGrad)" stroke-width="1.5"
            opacity="0.5" />
      <path d="M 100 480 Q 100 220 215 170 Q 330 220 330 480"
            fill="none" stroke="url(#goldGrad)" stroke-width="1"
            opacity="0.3" />

      <!-- Floral elements - top -->
      <g opacity="0.15" fill="#C9A84C">
        <circle cx="215" cy="120" r="8" />
        <ellipse cx="195" cy="130" rx="12" ry="4" transform="rotate(-30 195 130)" />
        <ellipse cx="235" cy="130" rx="12" ry="4" transform="rotate(30 235 130)" />
        <ellipse cx="185" cy="145" rx="10" ry="3" transform="rotate(-50 185 145)" />
        <ellipse cx="245" cy="145" rx="10" ry="3" transform="rotate(50 245 145)" />
      </g>

      <!-- Floral elements - left -->
      <g opacity="0.1" fill="#C9A84C">
        <circle cx="70" cy="350" r="5" />
        <ellipse cx="65" cy="330" rx="8" ry="3" transform="rotate(-20 65 330)" />
        <ellipse cx="60" cy="370" rx="8" ry="3" transform="rotate(20 60 370)" />
      </g>

      <!-- Floral elements - right -->
      <g opacity="0.1" fill="#C9A84C">
        <circle cx="360" cy="350" r="5" />
        <ellipse cx="365" cy="330" rx="8" ry="3" transform="rotate(20 365 330)" />
        <ellipse cx="370" cy="370" rx="8" ry="3" transform="rotate(-20 370 370)" />
      </g>

      <!-- Bottom florals -->
      <g opacity="0.12" fill="#C9A84C">
        <circle cx="120" cy="520" r="4" />
        <circle cx="310" cy="520" r="4" />
        <ellipse cx="105" cy="530" rx="10" ry="3" transform="rotate(-15 105 530)" />
        <ellipse cx="325" cy="530" rx="10" ry="3" transform="rotate(15 325 530)" />
      </g>

      <!-- Subtle mandala ring at center -->
      <circle cx="215" cy="340" r="60" fill="none" stroke="#C9A84C" stroke-width="0.5" opacity="0.15" />
      <circle cx="215" cy="340" r="80" fill="none" stroke="#C9A84C" stroke-width="0.3" opacity="0.1"
              stroke-dasharray="4 8" />
      <circle cx="215" cy="340" r="100" fill="none" stroke="#C9A84C" stroke-width="0.3" opacity="0.07"
              stroke-dasharray="2 12" />

      <!-- Tiny dots decorations -->
      <g opacity="0.1" fill="#C9A84C">
        <circle cx="150" cy="250" r="2" />
        <circle cx="280" cy="250" r="2" />
        <circle cx="130" cy="450" r="2" />
        <circle cx="300" cy="450" r="2" />
        <circle cx="170" cy="560" r="1.5" />
        <circle cx="260" cy="560" r="1.5" />
      </g>
    </svg>
  `;

    // Apply Ken Burns animation to the SVG
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.animation = 'kenBurns 15s ease-in-out forwards';
    }
}
