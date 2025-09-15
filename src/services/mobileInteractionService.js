/**
 * Enhanced Mobile Interaction Service
 * Handles touch gestures, haptic feedback, and mobile-specific interactions
 */

class MobileInteractionService {
  constructor() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isAndroid = /Android/.test(navigator.userAgent);
    this.hasHaptic = 'vibrate' in navigator;
    
    this.gestureHandlers = new Map();
    this.scrollDirection = 'down';
    this.lastScrollY = 0;
    this.keyboardHeight = 0;
    
    this.init();
  }

  init() {
    // Initialize mobile optimizations
    this.setupViewportHeight();
    this.setupTouchFeedback();
    this.setupGestureHandlers();
    this.setupKeyboardHandling();
    this.setupScrollHandling();
    this.setupPullToRefresh();
    
    console.log('✅ Mobile Interaction Service initialized', {
      isTouch: this.isTouch,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      hasHaptic: this.hasHaptic
    });
  }

  // Setup dynamic viewport height for mobile browsers
  setupViewportHeight() {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Also set the CSS custom property for dvh fallback
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100); // Delay for orientation change completion
    });
  }

  // Setup touch feedback and haptics
  setupTouchFeedback() {
    if (!this.isTouch) return;

    // Add touch feedback to all touch targets
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.touch-target, .mobile-action-button, button');
      if (target) {
        target.classList.add('touch-active');
        this.triggerHapticFeedback('light');
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const target = e.target.closest('.touch-target, .mobile-action-button, button');
      if (target) {
        setTimeout(() => {
          target.classList.remove('touch-active');
        }, 150);
      }
    }, { passive: true });

    // Add ripple effect
    document.addEventListener('touchstart', this.createRippleEffect.bind(this), { passive: true });
  }

  // Create ripple effect for touch feedback
  createRippleEffect(e) {
    const target = e.target.closest('.touch-ripple');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      transform: translate(-50%, -50%);
      animation: ripple-animation 0.6s ease-out;
    `;

    target.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Setup gesture handlers
  setupGestureHandlers() {
    let startY = 0;
    let startX = 0;
    let currentY = 0;
    let currentX = 0;
    let isScrolling = null;

    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isScrolling = null;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      currentY = e.touches[0].clientY;
      currentX = e.touches[0].clientX;
      
      if (isScrolling === null) {
        isScrolling = Math.abs(currentY - startY) > Math.abs(currentX - startX);
      }

      // Handle swipe gestures
      if (!isScrolling) {
        const deltaX = currentX - startX;
        const target = e.target.closest('.swipeable');
        
        if (target && Math.abs(deltaX) > 30) {
          this.handleSwipeGesture(target, deltaX);
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;
      
      // Detect swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const direction = deltaX > 0 ? 'right' : 'left';
        this.triggerGestureEvent('swipe', { direction, deltaX, target: e.target });
      } else if (Math.abs(deltaY) > 50) {
        const direction = deltaY > 0 ? 'down' : 'up';
        this.triggerGestureEvent('swipe', { direction, deltaY, target: e.target });
      }
    }, { passive: true });
  }

  // Handle swipe gestures
  handleSwipeGesture(element, deltaX) {
    const threshold = 80;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe right
        element.classList.add('swiped-right');
        this.triggerHapticFeedback('medium');
      } else {
        // Swipe left
        element.classList.add('swiped-left');
        this.triggerHapticFeedback('medium');
      }
    } else {
      // Reset
      element.classList.remove('swiped-right', 'swiped-left');
    }
  }

  // Setup keyboard handling for mobile
  setupKeyboardHandling() {
    if (!this.isTouch) return;

    // Visual viewport API for keyboard detection
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        this.keyboardHeight = heightDiff;
        
        if (heightDiff > 150) {
          // Keyboard is open
          document.body.classList.add('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
        } else {
          // Keyboard is closed
          document.body.classList.remove('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        }
      });
    } else {
      // Fallback for older browsers
      let initialHeight = window.innerHeight;
      
      window.addEventListener('resize', () => {
        const heightDiff = initialHeight - window.innerHeight;
        
        if (heightDiff > 150) {
          document.body.classList.add('keyboard-open');
        } else {
          document.body.classList.remove('keyboard-open');
        }
      });
    }

    // Prevent zoom on input focus for iOS
    if (this.isIOS) {
      document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          e.target.style.fontSize = '16px';
        }
      });
    }
  }

  // Setup scroll handling for navigation hiding
  setupScrollHandling() {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.pageYOffset;
          const direction = currentScrollY > this.lastScrollY ? 'down' : 'up';
          
          if (direction !== this.scrollDirection) {
            this.scrollDirection = direction;
            this.handleScrollDirection(direction);
          }
          
          this.lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Handle scroll direction changes
  handleScrollDirection(direction) {
    const navigation = document.querySelector('.mobile-navigation');
    
    if (navigation) {
      if (direction === 'down' && this.lastScrollY > 100) {
        navigation.classList.add('hidden');
      } else if (direction === 'up') {
        navigation.classList.remove('hidden');
      }
    }
  }

  // Setup pull-to-refresh functionality
  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    
    const refreshElements = document.querySelectorAll('.pull-to-refresh');
    
    refreshElements.forEach(element => {
      element.addEventListener('touchstart', (e) => {
        if (element.scrollTop === 0) {
          startY = e.touches[0].clientY;
          isPulling = true;
        }
      }, { passive: true });

      element.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 0 && element.scrollTop === 0) {
          e.preventDefault();
          
          if (pullDistance > 60) {
            element.classList.add('pulling');
            this.triggerHapticFeedback('light');
          } else {
            element.classList.remove('pulling');
          }
        }
      });

      element.addEventListener('touchend', (e) => {
        if (!isPulling) return;
        
        isPulling = false;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 80) {
          element.classList.add('refreshing');
          this.triggerHapticFeedback('medium');
          
          // Trigger refresh event
          this.triggerGestureEvent('pullToRefresh', { element });
          
          // Reset after 2 seconds (or when refresh completes)
          setTimeout(() => {
            element.classList.remove('refreshing', 'pulling');
          }, 2000);
        } else {
          element.classList.remove('pulling');
        }
      });
    });
  }

  // Trigger haptic feedback
  triggerHapticFeedback(type = 'light') {
    if (!this.hasHaptic) return;

    let pattern;
    switch (type) {
      case 'light':
        pattern = [10];
        break;
      case 'medium':
        pattern = [20];
        break;
      case 'heavy':
        pattern = [40];
        break;
      case 'success':
        pattern = [10, 50, 10];
        break;
      case 'error':
        pattern = [20, 100, 20, 100, 20];
        break;
      default:
        pattern = [10];
    }

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Trigger custom gesture events
  triggerGestureEvent(eventName, data) {
    const event = new CustomEvent(`mobile-${eventName}`, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    
    (data.target || document).dispatchEvent(event);
  }

  // Add gesture handler
  addGestureHandler(element, gesture, handler) {
    if (!this.gestureHandlers.has(element)) {
      this.gestureHandlers.set(element, new Map());
    }
    
    this.gestureHandlers.get(element).set(gesture, handler);
    element.addEventListener(`mobile-${gesture}`, handler);
  }

  // Remove gesture handler
  removeGestureHandler(element, gesture) {
    const elementHandlers = this.gestureHandlers.get(element);
    if (elementHandlers) {
      const handler = elementHandlers.get(gesture);
      if (handler) {
        element.removeEventListener(`mobile-${gesture}`, handler);
        elementHandlers.delete(gesture);
      }
    }
  }

  // Optimize scroll performance
  optimizeScrollPerformance(element) {
    if (!element) return;
    
    element.style.overflowScrolling = 'touch';
    element.style.willChange = 'scroll-position';
    element.style.transform = 'translateZ(0)';
  }

  // Get device info
  getDeviceInfo() {
    return {
      isTouch: this.isTouch,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      hasHaptic: this.hasHaptic,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.screen.orientation?.type || 'portrait-primary',
      keyboardHeight: this.keyboardHeight
    };
  }

  // Prevent default touch behaviors
  preventDefaultTouch(element, options = {}) {
    const {
      preventScroll = false,
      preventZoom = true,
      preventDoubleTap = true
    } = options;

    if (preventScroll) {
      element.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    if (preventZoom && this.isIOS) {
      element.addEventListener('gesturestart', (e) => e.preventDefault());
      element.addEventListener('gesturechange', (e) => e.preventDefault());
      element.addEventListener('gestureend', (e) => e.preventDefault());
    }

    if (preventDoubleTap) {
      element.style.touchAction = 'manipulation';
    }
  }
}

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-animation {
    to {
      width: 300px;
      height: 300px;
      opacity: 0;
    }
  }
  
  .touch-active {
    opacity: 0.7 !important;
    transform: scale(0.95) !important;
  }
`;
document.head.appendChild(style);

// Create global instance
const mobileInteractionService = new MobileInteractionService();

// Export utility functions
export const mobileUtils = {
  // Trigger haptic feedback
  haptic: (type) => mobileInteractionService.triggerHapticFeedback(type),
  
  // Add gesture handler
  addGesture: (element, gesture, handler) => 
    mobileInteractionService.addGestureHandler(element, gesture, handler),
  
  // Remove gesture handler
  removeGesture: (element, gesture) => 
    mobileInteractionService.removeGestureHandler(element, gesture),
  
  // Optimize element for scrolling
  optimizeScroll: (element) => 
    mobileInteractionService.optimizeScrollPerformance(element),
  
  // Get device information
  getDeviceInfo: () => mobileInteractionService.getDeviceInfo(),
  
  // Prevent touch behaviors
  preventTouch: (element, options) => 
    mobileInteractionService.preventDefaultTouch(element, options),
  
  // Check if touch device
  isTouch: () => mobileInteractionService.isTouch,
  
  // Check if iOS
  isIOS: () => mobileInteractionService.isIOS,
  
  // Check if Android
  isAndroid: () => mobileInteractionService.isAndroid
};

export default mobileInteractionService;