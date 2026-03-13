/* ============================================
   AS WEDDING — Screen 5: Events Selection
   ============================================ */

function renderEventsScreen() {
    const screen = document.getElementById('screen-events');
    if (!screen) return;

    const isHindi = getLang() === 'hi';
    const events = STRINGS.events;

    const guestEventsStr = sessionStorage.getItem('guest_events') || '[]';
    const guestEvents = JSON.parse(guestEventsStr);
    const hasEng = guestEvents.includes('engagement');
    const hasHal = guestEvents.includes('haldi');
    const hasWed = guestEvents.includes('wedding');

    let count = (hasEng?1:0) + (hasHal?1:0) + (hasWed?1:0);

    let layoutClass = '';
    let centerStyles = '';
    if (count === 1) {
       layoutClass = 'events-layout-1';
       centerStyles = 'display: flex; flex-direction: column; justify-content: center; min-height: 60vh;';
    } else if (count === 2) {
       layoutClass = 'events-layout-2';
    }

    screen.innerHTML = `
    <div class="floral-ornament floral-ornament-sm" style="margin-bottom: var(--space-md);"></div>

    <h2 class="events-heading ${isHindi ? 'text-hindi' : ''}">${t('eventsHeading')}</h2>

    <div class="events-grid ${layoutClass}" style="${centerStyles}">
      <!-- Row 1: Engagement + Haldi side by side (if count=3) -->
      <div class="events-row-top" style="${count < 3 ? 'display: contents;' : ''}">
        <div class="event-card card event-card-engagement" style="${hasEng ? '' : 'display:none;'}" onclick="openEvent('engagement')">
          <span class="event-card-icon">${events.engagement.icon}</span>
          <h3 class="event-card-title ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.engagement.title.hi : events.engagement.title.en}</h3>
          <p class="event-card-date ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.engagement.dateFormatted.hi : events.engagement.dateFormatted.en}</p>
          <div id="countdown-engagement"></div>
        </div>

        <div class="event-card card event-card-haldi" style="${hasHal ? '' : 'display:none;'}" onclick="openEvent('haldi')">
          <span class="event-card-icon">${events.haldi.icon}</span>
          <h3 class="event-card-title ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.haldi.title.hi : events.haldi.title.en}</h3>
          <p class="event-card-date ${isHindi ? 'text-hindi' : ''}">${isHindi ? events.haldi.dateFormatted.hi : events.haldi.dateFormatted.en}</p>
          <div id="countdown-haldi"></div>
        </div>
      </div>

      <!-- Row 2: Wedding full width -->
      <div class="event-card card event-card-wedding" style="${hasWed ? '' : 'display:none;'}" onclick="openEvent('wedding')">
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
