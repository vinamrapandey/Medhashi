/* ============================================
   AS WEDDING — Screen 4: Personal Message
   ============================================ */

function renderMessageScreen() {
    const screen = document.getElementById('screen-message');
    if (!screen) return;

    const isHindi = getLang() === 'hi';

    screen.innerHTML = `
    <div class="floral-ornament floral-ornament-sm" style="margin-bottom: var(--space-lg);"></div>

    <blockquote class="message-quote ${isHindi ? 'text-hindi' : ''}">
      ${t('personalMessage')}
    </blockquote>

    <p class="message-signature ${isHindi ? 'text-hindi' : ''}">${t('messageSignature')}</p>

    <div class="divider-simple" style="margin-top: var(--space-xl);"></div>
  `;
}
