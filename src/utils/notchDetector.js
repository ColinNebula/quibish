/**
 * Notch / Dynamic Island / Safe-Area Detector
 *
 * Measures the real CSS env(safe-area-inset-*) values at runtime and exposes
 * them as --sat / --sar / --sab / --sal custom properties on <html>.
 * Also adds the class "has-notch" to <html> when the top inset is > 0.
 *
 * Why not just use env() directly in CSS?
 *   - env() works fine in Chrome/Safari but some Android browsers and WebViews
 *     return 0 even when there is a notch.
 *   - In PWA (standalone) mode on iOS, safe-area-inset-top is only non-zero
 *     when apple-mobile-web-app-status-bar-style is "black-translucent".
 *   - Having CSS variables lets JS code (e.g. canvas drawing, positioning
 *     calculations) read the actual values without reflow tricks.
 */

function measureSafeAreas() {
  // Create a tiny off-screen element and read the computed padding set by env()
  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';');

  document.documentElement.appendChild(probe);
  const cs = getComputedStyle(probe);
  const top    = parseFloat(cs.paddingTop)    || 0;
  const right  = parseFloat(cs.paddingRight)  || 0;
  const bottom = parseFloat(cs.paddingBottom) || 0;
  const left   = parseFloat(cs.paddingLeft)   || 0;
  document.documentElement.removeChild(probe);

  return { top, right, bottom, left };
}

function applyNotchClasses({ top, right, bottom, left }) {
  const root = document.documentElement;

  // Expose as CSS custom properties (px values, no unit – easy to use in calc)
  root.style.setProperty('--sat', `${top}px`);
  root.style.setProperty('--sar', `${right}px`);
  root.style.setProperty('--sab', `${bottom}px`);
  root.style.setProperty('--sal', `${left}px`);

  if (top > 0) {
    root.classList.add('has-notch');
  } else {
    root.classList.remove('has-notch');
  }

  if (bottom > 0) {
    root.classList.add('has-home-indicator');
  } else {
    root.classList.remove('has-home-indicator');
  }
}

function initNotchDetector() {
  // Run once on startup
  const insets = measureSafeAreas();
  applyNotchClasses(insets);

  // Re-measure on orientation change / resize (notch moves on landscape)
  const recheck = () => {
    const insets = measureSafeAreas();
    applyNotchClasses(insets);
  };

  window.addEventListener('orientationchange', () => {
    // Brief delay so the browser has finished rotating before we measure
    setTimeout(recheck, 150);
  });

  window.addEventListener('resize', recheck, { passive: true });
}

// Run immediately if DOM is already ready, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotchDetector);
} else {
  initNotchDetector();
}

export { initNotchDetector };
