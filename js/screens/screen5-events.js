/* ============================================
   AS WEDDING — Screen 5: Events Selection
   ============================================ */

function renderEventsScreen() {
    const screen = document.getElementById('screen-events');
    if (!screen) return;

    const isHindi = getLang() === 'hi';
    const events = STRINGS.events;

    // Show all events to every logged-in guest
    const hasEng = true;
    const hasHal = true;
    const hasWed = true;

    let count = 3;

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

    <button class="guest-signout-btn" onclick="guestSignOut()" aria-label="Sign Out" title="Sign Out">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
        <path d="M116,216a12,12,0,0,1-12,12H48a20,20,0,0,1-20-20V48A20,20,0,0,1,48,28h56a12,12,0,0,1,0,24H52V204h52A12,12,0,0,1,116,216Zm108.49-96.49-40-40a12,12,0,0,0-17,17L187,116H104a12,12,0,0,0,0,24h83l-19.52,19.51a12,12,0,0,0,17,17l40-40A12,12,0,0,0,224.49,119.51Z"/>
      </svg>
    </button>

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
