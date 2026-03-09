/* ============================================
   AS WEDDING — Screen 3: Family Names
   ============================================ */

function renderFamilyScreen() {
    const screen = document.getElementById('screen-family');
    if (!screen) return;

    const isHindi = getLang() === 'hi';

    screen.innerHTML = `
    <div class="floral-ornament" style="margin-bottom: var(--space-xl);"></div>

    <h2 class="family-heading ${isHindi ? 'text-hindi' : ''}">${t('familyHeading')}</h2>

    <div class="family-columns">
      <!-- Bride's Family -->
      <div class="family-column">
        <p class="family-member-name ${isHindi ? 'text-hindi' : ''}">${t('brideName')}</p>
        <p class="family-relation ${isHindi ? 'text-hindi' : ''}">${t('brideRelation')}</p>
        <span class="family-parent-name ${isHindi ? 'text-hindi' : ''}">${t('brideFather')}</span>
        <p class="family-relation ${isHindi ? 'text-hindi' : ''}" style="margin-top: var(--space-2xs);">${t('andText')}</p>
        <span class="family-parent-name ${isHindi ? 'text-hindi' : ''}">${t('brideMother')}</span>
      </div>

      <!-- Gold Divider -->
      <div class="family-divider-vertical"></div>

      <!-- Groom's Family -->
      <div class="family-column">
        <p class="family-member-name ${isHindi ? 'text-hindi' : ''}">${t('groomName')}</p>
        <p class="family-relation ${isHindi ? 'text-hindi' : ''}">${t('groomRelation')}</p>
        <span class="family-parent-name ${isHindi ? 'text-hindi' : ''}">${t('groomFather')}</span>
        <p class="family-relation ${isHindi ? 'text-hindi' : ''}" style="margin-top: var(--space-2xs);">${t('andText')}</p>
        <span class="family-parent-name ${isHindi ? 'text-hindi' : ''}">${t('groomMother')}</span>
      </div>
    </div>

    <div class="floral-ornament" style="margin-top: var(--space-xl);"></div>
  `;
}
