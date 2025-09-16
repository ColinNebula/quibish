// Mobile Interaction Service
class MobileInteractionService {
  constructor() {
    this.isTouch = 'ontouchstart' in window;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.listeners = new Map();
  }

  init() {
    if (this.isTouch) {
      this.setupTouchHandlers();
    }
  }

  setupTouchHandlers() {
    // Prevent double-tap zoom on buttons
    document.addEventListener('touchend', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        e.preventDefault();
      }
    });

    // Handle touch feedback
    document.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  handleTouchStart(e) {
    const element = e.target;
    if (element.classList) {
      element.classList.add('touch-active');
    }
  }

  handleTouchEnd(e) {
    const element = e.target;
    if (element.classList) {
      element.classList.remove('touch-active');
    }
  }

  optimizeForMobile() {
    // Add mobile-specific optimizations
    if (this.isMobile) {
      document.body.classList.add('mobile-device');
      
      // Optimize scrolling
      document.body.style.webkitOverflowScrolling = 'touch';
      
      // Prevent pull-to-refresh
      document.body.style.overscrollBehavior = 'none';
    }
  }

  addMobileGesture(element, gesture, callback) {
    if (!this.isTouch) return;
    
    const gestureHandler = this.createGestureHandler(gesture, callback);
    element.addEventListener('touchstart', gestureHandler);
    
    this.listeners.set(element, gestureHandler);
  }

  createGestureHandler(gesture, callback) {
    return (e) => {
      // Basic gesture detection
      if (gesture === 'tap' && e.touches.length === 1) {
        callback(e);
      }
    };
  }

  cleanup() {
    this.listeners.clear();
  }
}

// Mobile Utils
export const mobileUtils = {
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  isAndroid() {
    return /Android/.test(navigator.userAgent);
  },

  getViewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight;
  },

  getViewportWidth() {
    return window.innerWidth || document.documentElement.clientWidth;
  },

  preventZoom() {
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });
  }
};

export default new MobileInteractionService();