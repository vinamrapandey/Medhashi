/* ============================================
   AS WEDDING — Screen 5: Events Selection
   ============================================ */

function renderEventsScreen() {
    const screen = document.getElementById('screen-events');
    if (!screen) return;

    const isHindi = getLang() === 'hi';
    const events = STRINGS.events;

    screen.innerHTML = `
    <div class="floral-ornament floral-ornament-sm" style="margin-bottom: var(--space-md);"></div>

    <h2 class="events-heading ${isHindi ? 'text-hindi' : ''}">${t('eventsHeading')}</h2>

    <div class="events-grid">
      <!-- Row 1: Engagement + Haldi side by side -->
      <div class="events-row-top">
        <div class="event-card card event-card-engagement" onclick="openEvent('engagement')">
          <span class="event-card-icon">${events.engagement.icon}</span>
          <h3 class="event-card-title ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.engagement.title.hi : events.engagement.title.en}</h3>
          <p class="event-card-date ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.engagement.dateFormatted.hi : events.engagement.dateFormatted.en}</p>
          <div id="countdown-engagement"></div>
        </div>

        <div class="event-card card event-card-haldi" onclick="openEvent('haldi')">
          <span class="event-card-icon">${events.haldi.icon}</span>
          <h3 class="event-card-title ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.haldi.title.hi : events.haldi.title.en}</h3>
          <p class="event-card-date ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.haldi.dateFormatted.hi : events.haldi.dateFormatted.en}</p>
          <div id="countdown-haldi"></div>
        </div>
      </div>

      <!-- Row 2: Wedding full width -->
      <div class="event-card card event-card-wedding" onclick="openEvent('wedding')">
        <span class="event-card-icon">${events.wedding.icon}</span>
        <h3 class="event-card-title ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.wedding.title.hi : events.wedding.title.en}</h3>
        <p class="event-card-date ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.wedding.dateFormatted.hi : events.wedding.dateFormatted.en}</p>
        <div id="countdown-wedding"></div>
      </div>
    </div>

    <div class="floral-ornament" style="margin-top: var(--space-2xl);"></div>
  `;

    // Start countdowns
    createCountdown(events.engagement.date, 'countdown-engagement', true);
    createCountdown(events.haldi.date, 'countdown-haldi', true);
    createCountdown(events.wedding.date, 'countdown-wedding', true);
}

function openEvent(eventKey) {
    clearAllCountdowns();
    navigateTo('screen-event-detail', { eventKey });
}
