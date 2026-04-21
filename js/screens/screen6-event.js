/* ============================================
   AS WEDDING — Screen 6: Event Detail Page
   Dynamic for engagement, haldi, wedding
   ============================================ */

const EVENT_WA_NAMES = {
  engagement: { en: 'the Engagement', hi: 'सगाई' },
  haldi: { en: 'Haldi, Mehandi & Sangeet', hi: 'हल्दी, मेहंदी और संगीत' },
  wedding: { en: 'the Wedding', hi: 'शादी' }
};

function renderEventDetailScreen(eventKey) {
  const screen = document.getElementById('screen-event-detail');
  if (!screen) return;

  const event = getEventData(eventKey);
  if (!event) return;

  const isHindi = getLang() === 'hi';
  const lang = getLang() || 'en';
  const eventWaName = EVENT_WA_NAMES[eventKey] ? EVENT_WA_NAMES[eventKey][lang] : event.title[lang];

  screen.className = `screen screen-event-detail event-theme-${event.theme}`;

  screen.innerHTML = `
    <!-- Header -->
    <div class="event-detail-header">
      <div class="floral-ornament floral-ornament-sm" style="margin-bottom: var(--space-md);"></div>

      <h1 class="event-detail-title ${isHindi ? 'text-hindi' : ''}">${event.title[lang]}</h1>
      <p class="event-detail-date ${isHindi ? 'text-hindi' : ''}">${event.dateFormatted[lang]}</p>
      <p class="event-detail-time ${isHindi ? 'text-hindi' : ''}">${event.time[lang]}</p>

      <div id="countdown-detail-${eventKey}" style="margin-top: var(--space-md);"></div>

      <div class="divider-simple" style="margin-top: var(--space-xl);"></div>
    </div>

    <!-- Invitation Section -->
    <div class="event-invitation-section">
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('invitationHeading')}</h2>

      <div class="invitation-card-preview" id="invitation-card-${eventKey}">
        <span class="floral-corner top-left">❋</span>
        <span class="floral-corner top-right">❋</span>
        <span class="floral-corner bottom-left">❋</span>
        <span class="floral-corner bottom-right">❋</span>

        <div class="monogram monogram-md" style="margin-bottom: var(--space-md);">A ❋ S</div>

        <p style="font-family: var(--font-heading-alt); font-size: var(--fs-sm); color: var(--text-light); font-style: italic; margin-bottom: var(--space-sm);">
          ${t('invCardLine1')}
        </p>
        <p style="font-family: var(--font-heading); font-size: var(--fs-xl); font-weight: var(--fw-bold); color: var(--text-primary); margin-bottom: var(--space-sm);">
          ${t('invCardCouple')}
        </p>
        <p style="font-family: var(--font-heading-alt); font-size: var(--fs-sm); color: var(--text-light); font-style: italic; margin-bottom: var(--space-lg);">
          ${t('invCardLine2')}
        </p>
        <p style="font-family: var(--font-heading); font-size: var(--fs-lg); font-weight: var(--fw-semibold); color: var(--antique-gold); margin-bottom: var(--space-xs);">
          ${event.title[lang]}
        </p>
        <p style="font-size: var(--fs-base); color: var(--text-primary); margin-bottom: var(--space-xs);">
          ${event.dateFormatted[lang]}
        </p>
        <p style="font-size: var(--fs-sm); color: var(--text-light);">
          ${event.time[lang]}
        </p>
        <div class="divider-simple" style="margin: var(--space-md) auto;"></div>
        <p style="font-size: var(--fs-sm); color: var(--text-light);">
          ${event.venue.name[lang]}
        </p>
        <p style="font-size: var(--fs-xs); color: var(--text-light); opacity: 0.7;">
          ${event.venue.address[lang]}
        </p>
      </div>

      <button class="btn btn-secondary" onclick="downloadInvitationPDF('${eventKey}')">
        ⬇ ${t('downloadPdf')}
      </button>
    </div>

    <!-- Venue Section -->
    <div class="event-venue-section">
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('venueLabel')}</h2>
      ${renderVenueCards(event, lang, isHindi)}
    </div>

    <!-- Share Your Memories Section -->
    <div class="event-gallery-section" style="padding-top: 0;">
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('shareHeading')}</h2>

      <div style="background-color: var(--cream); border: 2px solid var(--gold-light); border-radius: var(--radius-lg); padding: var(--space-xl) var(--space-lg); text-align: center;">
        <button class="btn btn-block" style="background-color: var(--antique-gold); color: #FFFFFF; font-family: var(--font-primary); border-radius: 24px; padding: 14px 24px; border: none; font-size: var(--fs-md); font-weight: var(--fw-semibold); width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.open('${getWhatsAppUrl(eventWaName, lang)}', '_blank')">
          ${t('sharePhotosBtn')}
        </button>
        <p style="font-size: var(--fs-xs); color: var(--text-light); font-style: italic; margin-top: var(--space-md); margin-bottom: 0;">
          ${t('sharePhotosNote')}
        </p>
      </div>

      <!-- Photo Gallery -->
      <div class="divider-simple" style="margin: var(--space-xl) auto var(--space-lg);"></div>
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('photosHeading')}</h2>
      <div id="gallery-${eventKey}" class="gallery-grid"></div>
    </div>
  `;

  createCountdown(event.date, `countdown-detail-${eventKey}`);
  loadGallery(eventKey);
}

function getWhatsAppUrl(eventName, lang) {
  const waNum = window.WHATSAPP_NUMBER || window.MEDHASHI_CONFIG?.whatsapp_number || '918917028655';
  const msgFn = STRINGS.waPrefilledMsg[lang];
  const msg = typeof msgFn === 'function' ? msgFn(eventName) : `Hi! I am sending my photos from ${eventName}. My name is: `;
  return `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;
}

function renderVenueCards(event, lang, isHindi) {
  return `
    <div class="venue-card card card-gold" style="margin-bottom: var(--space-md);">
      <p class="venue-label">${t('venueLabel')}</p>
      <h3 class="venue-name ${isHindi ? 'text-hindi' : ''}">${event.venue.name[lang]}</h3>
      <p class="venue-address ${isHindi ? 'text-hindi' : ''}">${event.venue.address[lang]}</p>
      <a href="${event.venue.mapUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm venue-map-btn">
        📍 ${t('takeMethere')}
      </a>
    </div>
  `;
}
