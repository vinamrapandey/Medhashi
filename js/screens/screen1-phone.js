/* ============================================
   AS WEDDING — Screen 1: Phone Number Entry
   ============================================ */

function renderPhoneScreen() {
    const screen = document.getElementById('screen-phone');
    if (!screen) return;

    const lang = getLang() || 'en';
    const isHindi = lang === 'hi';

    screen.innerHTML = `
    <div class="phone-card card card-arch">
      <span class="floral-corner top-left">❋</span>
      <span class="floral-corner top-right">❋</span>
      <span class="floral-corner bottom-left">❋</span>
      <span class="floral-corner bottom-right">❋</span>

      <div class="floral-ornament" style="margin-bottom: var(--space-lg);"></div>

      <h1 class="phone-heading ${isHindi ? 'text-hindi' : ''}">${t('phoneHeading')}</h1>
      <p class="phone-subtext ${isHindi ? 'text-hindi' : ''}">${t('phoneSubtext')}</p>

      <form class="phone-form" id="phone-form" onsubmit="handlePhoneSubmit(event)">
        <div class="phone-input-wrapper">
          <span class="phone-prefix">+91</span>
          <input
            type="tel"
            class="input-field phone-input"
            id="phone-input"
            placeholder="${t('phonePlaceholder')}"
            maxlength="10"
            pattern="[0-9]{10}"
            inputmode="numeric"
            autocomplete="tel"
            required
          >
        </div>
        <div id="phone-error" class="error-text" style="display:none;"></div>
        <button type="submit" class="btn btn-primary btn-block btn-lg ${isHindi ? 'text-hindi' : ''}" id="phone-submit-btn">
          ${t('phoneContinue')}
        </button>
      </form>

      <div class="floral-ornament floral-ornament-sm" style="margin-top: var(--space-xl);"></div>
    </div>
  `;

    // Focus input
    setTimeout(() => {
        const input = document.getElementById('phone-input');
        if (input) input.focus();
    }, 400);
}

async function handlePhoneSubmit(e) {
    e.preventDefault();

    const input = document.getElementById('phone-input');
    const errorEl = document.getElementById('phone-error');
    const submitBtn = document.getElementById('phone-submit-btn');
    const phone = input.value.trim();

    // Validate
    if (!/^\d{10}$/.test(phone)) {
        errorEl.textContent = getLang() === 'hi'
            ? 'कृपया 10 अंकों का मान्य फ़ोन नंबर दर्ज करें'
            : 'Please enter a valid 10-digit phone number';
        errorEl.style.display = 'block';
        input.classList.add('input-error');
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = '...';
    errorEl.style.display = 'none';
    input.classList.remove('input-error');

    try {
        // Lookup guest in Firestore
        const guest = await lookupGuest(phone);

        if (guest) {
            // Save to session
            sessionStorage.setItem('guest_phone', phone);
            sessionStorage.setItem('guest_name', guest.name);
            sessionStorage.setItem('guest_name_hindi', guest.nameHindi || guest.name);
            sessionStorage.setItem('guest_events', JSON.stringify(guest.events || []));
            sessionStorage.setItem('guest_can_upload', guest.canUpload ? 'true' : 'false');

            // Log access
            logGuestAccess(phone, guest.name);

            // Show welcome toast
            const welcomeMsg = getLang() === 'hi'
                ? STRINGS.phoneWelcome.hi(guest.nameHindi || guest.name)
                : STRINGS.phoneWelcome.en(guest.name);
            showToast(welcomeMsg);

            // Navigate to main flow
            setTimeout(() => {
                showLoader();
                hideLoader(600).then(() => {
                    initMainFlow();
                });
            }, 800);
        } else {
            // Guest not found
            errorEl.textContent = t('phoneErrorNotFound');
            errorEl.style.display = 'block';
            input.classList.add('input-error');
            submitBtn.disabled = false;
            submitBtn.textContent = t('phoneContinue');
        }
    } catch (error) {
        console.error('Phone verification error:', error);
        errorEl.textContent = getLang() === 'hi'
            ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।'
            : 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = t('phoneContinue');
    }
}
