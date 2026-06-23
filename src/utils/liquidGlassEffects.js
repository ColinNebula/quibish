/**
 * Liquid Glass Effects & Modern Smartphone Interactions
 * Provides haptic feedback, gesture support, and advanced effects
 */

class LiquidGlassEffects {
  constructor() {
    this.isSupported = {
      haptic: 'vibrate' in navigator,
      touches: 'ontouchstart' in window,
      accelerometer: 'DeviceMotionEvent' in window,
      ambientLight: (typeof window !== 'undefined' && window.AmbientLightSensor) || false,
    };

    this.config = {
      hapticEnabled: true,
      gesturesEnabled: true,
      parallaxEnabled: true,
      animationsEnabled: !this.prefersReducedMotion(),
      performanceMode: this.detectPerformanceMode(),
    };

    this.gestures = {
      touchStartX: 0,
      touchStartY: 0,
      touchEndX: 0,
      touchEndY: 0,
    };

    this.initialize();
  }

  /**
   * Initialize effects and event listeners
   */
  initialize() {
    console.log('🌊 Initializing Liquid Glass Effects', {
      haptic: this.isSupported.haptic,
      touches: this.isSupported.touches,
      performance: this.config.performanceMode,
    });

    if (this.config.gesturesEnabled && this.isSupported.touches) {
      this.setupGestureListeners();
    }

    if (this.config.parallaxEnabled) {
      this.setupParallaxListener();
    }

    // Initialize dynamic island notifications
    this.setupDynamicIsland();
  }

  /**
   * HAPTIC FEEDBACK
   */

  /**
   * Haptic feedback patterns matching iOS/Android standards
   */
  haptic = {
    light: () => this.vibrate([10]),
    medium: () => this.vibrate([20]),
    heavy: () => this.vibrate([30]),
    success: () => this.vibrate([10, 20, 10]),
    warning: () => this.vibrate([20, 10, 20]),
    error: () => this.vibrate([30, 10, 30]),
    selection: () => this.vibrate([5, 5]),
    impact: () => this.vibrate([40]),
    notification: () => this.vibrate([20, 10, 20, 10, 20]),
    custom: (pattern) => this.vibrate(pattern),
  };

  /**
   * Execute haptic pattern
   */
  vibrate(pattern) {
    if (!this.config.hapticEnabled || !this.isSupported.haptic) return;

    try {
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern);
      } else if (typeof pattern === 'number') {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.warn('⚠️ Haptic feedback failed:', error);
    }
  }

  /**
   * Stop haptic vibration
   */
  hapticStop() {
    if (this.isSupported.haptic) {
      navigator.vibrate(0);
    }
  }

  /**
   * GESTURE SUPPORT
   */

  setupGestureListeners() {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
  }

  handleTouchStart(e) {
    this.gestures.touchStartX = e.changedTouches[0].screenX;
    this.gestures.touchStartY = e.changedTouches[0].screenY;
  }

  handleTouchEnd(e) {
    this.gestures.touchEndX = e.changedTouches[0].screenX;
    this.gestures.touchEndY = e.changedTouches[0].screenY;
    this.handleSwipe();
  }

  handleTouchMove(e) {
    // Could add real-time parallax or drag effects here
  }

  handleSwipe() {
    const diffX = this.gestures.touchStartX - this.gestures.touchEndX;
    const diffY = this.gestures.touchStartY - this.gestures.touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 50) {
        // Horizontal swipe
        if (diffX > 0) {
          this.dispatchGestureEvent('swipe-left');
        } else {
          this.dispatchGestureEvent('swipe-right');
        }
      }
    } else {
      if (Math.abs(diffY) > 50) {
        // Vertical swipe
        if (diffY > 0) {
          this.dispatchGestureEvent('swipe-up');
        } else {
          this.dispatchGestureEvent('swipe-down');
        }
      }
    }
  }

  dispatchGestureEvent(gestureType) {
    window.dispatchEvent(
      new CustomEvent('liquidGestureEvent', {
        detail: { gesture: gestureType },
      })
    );
    console.log(`📱 Gesture detected: ${gestureType}`);
  }

  /**
   * PARALLAX EFFECTS
   */

  setupParallaxListener() {
    if (!this.isSupported.accelerometer) return;

    window.addEventListener('devicemotion', (e) => {
      this.handleParallax(e);
    });
  }

  handleParallax(e) {
    const alpha = e.acceleration.x || 0;
    const beta = e.acceleration.y || 0;

    const parallaxElements = document.querySelectorAll('[data-parallax]');
    parallaxElements.forEach((el) => {
      const depth = parseFloat(el.dataset.parallax) || 1;
      const x = alpha * depth * 2;
      const y = beta * depth * 2;

      el.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
  }

  /**
   * DYNAMIC ISLAND NOTIFICATIONS
   */

  setupDynamicIsland() {
    window.showDynamicIslandNotification = (message, options = {}) => {
      this.createDynamicIsland(message, options);
    };
  }

  createDynamicIsland(message, options = {}) {
    const {
      duration = 3000,
      icon = '✨',
      action = null,
      type = 'info', // 'info', 'success', 'warning', 'error'
      onDismiss = null,
    } = options;

    const island = document.createElement('div');
    island.className = 'dynamic-island';
    island.innerHTML = `
      <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
      <span style="flex: 1; font-size: 14px; font-weight: 500;">${message}</span>
      ${action ? `<button style="background: none; border: none; cursor: pointer; color: inherit;">${action.label}</button>` : ''}
    `;

    // Add type styling
    island.dataset.type = type;
    island.style.setProperty('--type-color', this.getTypeColor(type));

    document.body.appendChild(island);

    // Haptic feedback
    if (type === 'success') {
      this.haptic.success();
    } else if (type === 'error') {
      this.haptic.error();
    } else if (type === 'warning') {
      this.haptic.warning();
    }

    // Auto dismiss
    const timeout = setTimeout(() => {
      this.dismissDynamicIsland(island, onDismiss);
    }, duration);

    // Click handler
    if (action?.callback) {
      island.addEventListener('click', () => {
        clearTimeout(timeout);
        action.callback();
        this.dismissDynamicIsland(island, onDismiss);
      });
    }

    return island;
  }

  dismissDynamicIsland(island, callback) {
    island.classList.add('dismiss');
    setTimeout(() => {
      island.remove();
      if (callback) callback();
    }, 300);
  }

  getTypeColor(type) {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };
    return colors[type] || colors.info;
  }

  /**
   * INTERACTIVE BUTTON EFFECTS
   */

  /**
   * Create liquid morph button effect
   */
  addLiquidMorphEffect(element) {
    element.classList.add('button-liquid-morph');

    element.addEventListener('mouseenter', () => {
      this.haptic.light();
    });

    element.addEventListener('mousedown', () => {
      this.haptic.medium();
    });
  }

  /**
   * Create glass card hover effect
   */
  addGlassCardEffect(element) {
    element.classList.add('liquid-glass-card');

    element.addEventListener('mouseenter', () => {
      element.classList.add('glass-shimmer');
    });

    element.addEventListener('mouseleave', () => {
      element.classList.remove('glass-shimmer');
    });
  }

  /**
   * FLOATING ACTION BUTTON
   */

  createFloatingActionButton(options = {}) {
    const { icon = '✨', label = '', onClick = null, position = 'bottom-right' } = options;

    const fab = document.createElement('button');
    fab.className = 'fab-spring';
    fab.innerHTML = icon;
    fab.title = label;

    if (onClick) {
      fab.addEventListener('click', () => {
        this.haptic.impact();
        onClick();
      });
    }

    fab.addEventListener('mouseenter', () => {
      this.haptic.light();
    });

    document.body.appendChild(fab);
    return fab;
  }

  /**
   * AMBIENT LIGHT ADAPTATION (for OLED screens)
   */

  setupAmbientLightAdaptation() {
    if (!this.isSupported.ambientLight) return;

    try {
      // eslint-disable-next-line no-undef
      const sensor = new AmbientLightSensor();

      sensor.addEventListener('reading', () => {
        const illuminance = sensor.illuminance;

        // Adjust glass opacity and blur based on ambient light
        if (illuminance < 50) {
          // Dark environment - increase glass opacity
          document.documentElement.style.setProperty('--glass-opacity', '0.9');
          document.documentElement.style.setProperty('--glass-blur', '12px');
        } else if (illuminance > 500) {
          // Bright environment - reduce glass opacity for better visibility
          document.documentElement.style.setProperty('--glass-opacity', '0.7');
          document.documentElement.style.setProperty('--glass-blur', '20px');
        }
      });

      sensor.addEventListener('error', (event) => {
        console.warn('⚠️ Ambient light sensor error:', event.error);
      });

      sensor.start();
    } catch (error) {
      console.warn('⚠️ Ambient light sensor not available:', error);
    }
  }

  /**
   * UTILITY FUNCTIONS
   */

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Detect performance mode (low-end vs high-end device)
   */
  detectPerformanceMode() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;

    if (cores <= 2 || memory <= 2) {
      console.log('📱 Low-end device detected - reduced animations');
      return 'low';
    } else if (cores >= 6 && memory >= 6) {
      console.log('🚀 High-end device detected - full effects enabled');
      return 'high';
    }
    return 'medium';
  }

  /**
   * Enable/disable haptic feedback globally
   */
  setHapticEnabled(enabled) {
    this.config.hapticEnabled = enabled;
    localStorage.setItem('quibish_haptic_enabled', enabled);
  }

  /**
   * Enable/disable animations globally
   */
  setAnimationsEnabled(enabled) {
    this.config.animationsEnabled = enabled;
    if (!enabled) {
      document.documentElement.style.setProperty('--transition-fast', '0ms');
      document.documentElement.style.setProperty('--transition-base', '0ms');
      document.documentElement.style.setProperty('--transition-slow', '0ms');
    } else {
      document.documentElement.style.removeProperty('--transition-fast');
      document.documentElement.style.removeProperty('--transition-base');
      document.documentElement.style.removeProperty('--transition-slow');
    }
  }

  /**
   * Get device capabilities
   */
  getCapabilities() {
    return {
      ...this.isSupported,
      performanceMode: this.config.performanceMode,
      prefersReducedMotion: this.prefersReducedMotion(),
    };
  }
}

// Initialize on page load
const liquidGlassEffects = new LiquidGlassEffects();

// Export for module usage
export default liquidGlassEffects;
