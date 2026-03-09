/* ============================================
   AS WEDDING — Screen 0: Language Select
   ============================================ */

function renderLanguageScreen() {
    const screen = document.getElementById('screen-language');
    if (!screen) return;

    screen.innerHTML = `
    <div class="monogram monogram-lg">A ❋ S</div>

    <div class="divider-simple"></div>

    <div class="lang-heading">
      <p class="lang-heading-en">${STRINGS.langSelectEn}</p>
      <p class="lang-heading-hi text-hindi">${STRINGS.langSelectHi}</p>
    </div>

    <div class="lang-buttons">
      <button class="btn btn-primary" id="btn-lang-en" onclick="selectLanguage('en')">
        ${STRINGS.langEnglish}
      </button>
      <button class="btn btn-secondary" id="btn-lang-hi" onclick="selectLanguage('hi')">
        ${STRINGS.langHindi}
      </button>
    </div>

    <div class="floral-ornament" style="margin-top: var(--space-xl);"></div>
  `;
}

function selectLanguage(lang) {
    setLang(lang);
    navigateTo('screen-phone');
}
