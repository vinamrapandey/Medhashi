/* ============================================
   AS WEDDING — Screen 6: Event Detail Page
   Dynamic for engagement, haldi, wedding
   ============================================ */

const WHATSAPP_NUMBER = '918917028655';

function renderEventDetailScreen(eventKey) {
  const screen = document.getElementById('screen-event-detail');
  if (!screen) return;

  const event = getEventData(eventKey);
  if (!event) return;

  const isHindi = getLang() === 'hi';
  const lang = getLang() || 'en';

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

    <!-- Venue Section -->
    <div class="event-venue-section">
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('venueLabel')}</h2>
      ${renderVenueCards(event, lang, isHindi)}
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

    <!-- Share Your Moments Section -->
    <div class="event-gallery-section">
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('shareHeading')}</h2>

      <div class="share-options-grid">
        <!-- WhatsApp Option (Primary) -->
        <div class="share-option-card share-wa">
          <div class="share-option-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h3 class="share-option-title ${isHindi ? 'text-hindi' : ''}">${t('waSendVia')}</h3>
          <p class="share-option-subtext ${isHindi ? 'text-hindi' : ''}">${t('waSubtext')}</p>
          <a href="${getWhatsAppUrl(event, lang)}" target="_blank" rel="noopener" class="btn btn-wa">
            ${t('waSendVia')} →
          </a>
          <span class="share-option-tag share-tag-wa ${isHindi ? 'text-hindi' : ''}">${t('waTag')}</span>
        </div>

        <!-- Direct Upload Option -->
        <div class="share-option-card share-upload">
          <div class="share-option-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--antique-gold)">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
          </div>
          <h3 class="share-option-title ${isHindi ? 'text-hindi' : ''}">${t('uploadVideosLabel')}</h3>
          <p class="share-option-subtext ${isHindi ? 'text-hindi' : ''}">${t('uploadVideosSubtext')}</p>
          <button class="btn btn-upload-gold" onclick="handleUploadClick('${eventKey}')">
            ${t('uploadVideosLabel')} →
          </button>
          <span class="share-option-tag share-tag-upload ${isHindi ? 'text-hindi' : ''}">${t('uploadVideosTag')}</span>
        </div>
      </div>

      <p class="share-note ${isHindi ? 'text-hindi' : ''}">${t('shareNote')}</p>

      <input type="file" id="file-input-${eventKey}" accept="image/*,video/*" multiple style="display:none;" onchange="handleFileSelected(event, '${eventKey}')">
      <div id="upload-progress-${eventKey}"></div>

      <!-- Photo Gallery -->
      <div class="divider-simple" style="margin: var(--space-xl) auto var(--space-lg);"></div>
      <h2 class="section-heading ${isHindi ? 'text-hindi' : ''}">${t('photosHeading')}</h2>
      <div id="gallery-${eventKey}" class="gallery-grid"></div>
    </div>
  `;

  // Start countdown for this event
  createCountdown(event.date, `countdown-detail-${eventKey}`);

  // Load gallery photos
  loadGallery(eventKey);
}

function getWhatsAppUrl(event, lang) {
  const eventName = event.title[lang];
  const msgFn = STRINGS.waPrefilledMsg[lang];
  const msg = typeof msgFn === 'function' ? msgFn(eventName) : `Hi! Sending photos from ${eventName}. My name is: `;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function renderVenueCards(event, lang, isHindi) {
  let html = `
    <div class="venue-card card card-gold" style="margin-bottom: var(--space-md);">
      <p class="venue-label">${t('venueLabel')}</p>
      <h3 class="venue-name ${isHindi ? 'text-hindi' : ''}">${event.venue.name[lang]}</h3>
      <p class="venue-address ${isHindi ? 'text-hindi' : ''}">${event.venue.address[lang]}</p>
      <a href="${event.venue.mapUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm venue-map-btn">
        📍 ${t('takeMethere')}
      </a>
    </div>
  `;

  return html;
}
