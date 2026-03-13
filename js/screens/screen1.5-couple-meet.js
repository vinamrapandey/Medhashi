/* ============================================
   AS WEDDING — Screen 1.5: Couple Meet Animation
   ============================================ */

function renderCoupleMeetScreen() {
    const screen = document.getElementById('screen-couple-meet');
    if (!screen) return;

    screen.innerHTML = `
      <div class="couple-meet-wrapper" onclick="goToStory()">
          <!-- floating particles -->
          <div class="meet-particles"></div>
          
          <!-- center scene -->
          <div class="meet-scene">
              <div class="meet-monogram">A ✦ S</div>
              <div class="meet-pulse"></div>
              
              <div class="meet-couple">
                  <div class="meet-bride">
                      <div class="meet-head"><div class="meet-smile"></div></div>
                      <div class="meet-body-bride"></div>
                  </div>
                  
                  <div class="meet-groom">
                      <div class="meet-head"><div class="meet-smile"></div></div>
                      <div class="meet-body-groom"></div>
                  </div>
              </div>
          </div>
          <div class="meet-continue">→</div>
      </div>
    `;
}

function goToStory() {
    const screen = document.getElementById('screen-couple-meet');
    if (!screen) {
        navigateTo('screen-story', { skipLoader: true });
        return;
    }
    screen.style.transition = 'opacity 0.3s ease';
    screen.style.opacity = '0';
    setTimeout(() => {
        navigateTo('screen-story', { skipLoader: true });
        // Reset opacity for potential future visits
        setTimeout(() => {
            screen.style.opacity = '1';
        }, 50);
    }, 300);
}
