// Mobile Gesture Handler for Enhanced UX
class MobileGestureHandler {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isSwipeEnabled = true;
    this.swipeThreshold = 50; // minimum distance for swipe
    this.listeners = new Map();
  }

  /**
   * Initialize gesture handlers
   */
  init() {
    if (!this.isMobile()) return;

    // Add touch event listeners
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    // Prevent pull-to-refresh on iOS
    document.body.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) return; // Allow pinch zoom
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop === 0 && e.touches[0].clientY > this.touchStartY) {
        e.preventDefault();
      }
    }, { passive: false });

    console.log('✅ Mobile gesture handler initialized');
  }

  /**
   * Check if device is mobile
   */
  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    if (!this.isSwipeEnabled) return;
    
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    if (!this.isSwipeEnabled) return;
    
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    if (!this.isSwipeEnabled) return;

    this.handleSwipeGesture();
  }

  /**
   * Detect swipe direction
   */
  handleSwipeGesture() {
    const diffX = this.touchEndX - this.touchStartX;
    const diffY = this.touchEndY - this.touchStartY;

    // Check if horizontal swipe is dominant
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > this.swipeThreshold) {
        if (diffX > 0) {
          this.emit('swipeRight', { distance: diffX });
        } else {
          this.emit('swipeLeft', { distance: Math.abs(diffX) });
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > this.swipeThreshold) {
        if (diffY > 0) {
          this.emit('swipeDown', { distance: diffY });
        } else {
          this.emit('swipeUp', { distance: Math.abs(diffY) });
        }
      }
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * Enable/disable swipe gestures
   */
  setSwipeEnabled(enabled) {
    this.isSwipeEnabled = enabled;
  }

  /**
   * Setup sidebar swipe gesture
   */
  setupSidebarGesture(sidebar, overlay) {
    this.on('swipeRight', ({ distance }) => {
      if (this.touchStartX < 50 && distance > 100) {
        // Swipe from left edge
        this.openSidebar(sidebar, overlay);
      }
    });

    this.on('swipeLeft', ({ distance }) => {
      if (sidebar.classList.contains('open') && distance > 100) {
        // Swipe to close sidebar
        this.closeSidebar(sidebar, overlay);
      }
    });

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeSidebar(sidebar, overlay);
      });
    }
  }

  /**
   * Open sidebar
   */
  openSidebar(sidebar, overlay) {
    if (!sidebar) return;
    
    sidebar.classList.add('open');
    if (overlay) {
      overlay.classList.add('visible');
    }
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close sidebar
   */
  closeSidebar(sidebar, overlay) {
    if (!sidebar) return;
    
    sidebar.classList.remove('open');
    if (overlay) {
      overlay.classList.remove('visible');
    }
    document.body.style.overflow = '';
  }

  /**
   * Add haptic feedback (iOS)
   */
  hapticFeedback(style = 'light') {
    if (!window.navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 50, 20],
      error: [30, 50, 30]
    };

    window.navigator.vibrate(patterns[style] || patterns.light);
  }

  /**
   * Handle pull-to-refresh
   */
  setupPullToRefresh(container, onRefresh) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const threshold = 80;

    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'pull-to-refresh-indicator';
    refreshIndicator.innerHTML = '<div class="refresh-spinner"></div>';
    refreshIndicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    `;
    container.prepend(refreshIndicator);

    container.addEventListener('touchstart', (e) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isDragging = true;
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && container.scrollTop === 0) {
        const scale = Math.min(diff / threshold, 1);
        refreshIndicator.style.transform = `translateX(-50%) translateY(${diff}px) rotate(${scale * 360}deg)`;
      }
    }, { passive: true });

    container.addEventListener('touchend', async () => {
      if (!isDragging) return;
      isDragging = false;

      const diff = currentY - startY;
      if (diff > threshold) {
        refreshIndicator.classList.add('refreshing');
        this.hapticFeedback('medium');
        
        await onRefresh();
        
        refreshIndicator.classList.remove('refreshing');
      }

      refreshIndicator.style.transform = 'translateX(-50%) translateY(0)';
    }, { passive: true });
  }

  /**
   * Optimize for iOS
   */
  optimizeForIOS() {
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    // Fix iOS input zoom
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.style.fontSize && parseFloat(input.style.fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });

    // Add viewport-fit support
    if (!document.querySelector('meta[name="viewport"]').content.includes('viewport-fit')) {
      const viewport = document.querySelector('meta[name="viewport"]');
      viewport.content += ', viewport-fit=cover';
    }

    console.log('✅ iOS optimizations applied');
  }

  /**
   * Cleanup
   */
  destroy() {
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    this.listeners.clear();
  }
}

// Export singleton instance
const mobileGestureHandler = new MobileGestureHandler();
export default mobileGestureHandler;
