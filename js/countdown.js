/* ============================================
   AS WEDDING — Countdown Timer
   ============================================ */

const activeCountdowns = {};

function createCountdown(targetDateStr, elementId, small = false) {
    const targetDate = new Date(targetDateStr + 'T00:00:00+05:30'); // IST
    const element = document.getElementById(elementId);
    if (!element) return;

    // Clear existing interval for this element
    if (activeCountdowns[elementId]) {
        clearInterval(activeCountdowns[elementId]);
    }

    function update() {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            // Event day or past
            element.innerHTML = `<span class="countdown-celebration">${t('countdownToday')}</span>`;
            clearInterval(activeCountdowns[elementId]);
            delete activeCountdowns[elementId];
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const sizeClass = small ? 'countdown-small' : '';

        element.innerHTML = `
      <div class="countdown ${sizeClass}">
        <div class="countdown-unit">
          <span class="countdown-value">${String(days).padStart(2, '0')}</span>
          <span class="countdown-label">${t('countdownDays')}</span>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-unit">
          <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
          <span class="countdown-label">${t('countdownHours')}</span>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-unit">
          <span class="countdown-value">${String(minutes).padStart(2, '0')}</span>
          <span class="countdown-label">${t('countdownMinutes')}</span>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-unit">
          <span class="countdown-value">${String(seconds).padStart(2, '0')}</span>
          <span class="countdown-label">${t('countdownSeconds')}</span>
        </div>
      </div>
    `;
    }

    // Initial update
    update();

    // Update every second
    activeCountdowns[elementId] = setInterval(update, 1000);
}

function clearAllCountdowns() {
    Object.keys(activeCountdowns).forEach(key => {
        clearInterval(activeCountdowns[key]);
        delete activeCountdowns[key];
    });
}

function clearCountdown(elementId) {
    if (activeCountdowns[elementId]) {
        clearInterval(activeCountdowns[elementId]);
        delete activeCountdowns[elementId];
    }
}
