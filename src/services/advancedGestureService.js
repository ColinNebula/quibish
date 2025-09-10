/**
 * Advanced Touch Gesture Service
 * Handles multi-touch gestures, pinch-to-zoom, rotation, long-press, and accessibility
 */

class AdvancedTouchGestureService {
  constructor() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.activeGestures = new Map();
    this.gestureHistory = [];
    this.longPressDelay = 500;
    this.tapThreshold = 10;
    this.swipeThreshold = 50;
    this.pinchThreshold = 0.1;
    this.rotationThreshold = 5; // degrees
    
    this.gestureStates = {
      idle: 'idle',
      touching: 'touching',
      gesturing: 'gesturing',
      pinching: 'pinching',
      rotating: 'rotating',
      swiping: 'swiping'
    };
    
    this.currentState = this.gestureStates.idle;
    this.gestureData = this.createGestureData();
    
    this.init();
  }

  /**
   * Initialize the gesture service
   */
  init() {
    if (!this.isTouch) {
      console.log('👆 Touch not supported, gesture service disabled');
      return;
    }
    
    this.setupGestureListeners();
    this.setupAccessibilityFeatures();
    this.setupContextMenus();
    
    console.log('✋ Advanced Touch Gesture Service initialized');
  }

  /**
   * Create initial gesture data structure
   */
  createGestureData() {
    return {
      touches: [],
      startTime: 0,
      lastTime: 0,
      startCenter: { x: 0, y: 0 },
      currentCenter: { x: 0, y: 0 },
      startDistance: 0,
      currentDistance: 0,
      startAngle: 0,
      currentAngle: 0,
      scale: 1,
      rotation: 0,
      velocity: { x: 0, y: 0 },
      direction: null,
      target: null,
      longPressTimer: null,
      tapCount: 0,
      lastTapTime: 0
    };
  }

  /**
   * Setup comprehensive gesture listeners
   */
  setupGestureListeners() {
    // Touch start - initialize gesture tracking
    document.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e);
    }, { passive: false });

    // Touch move - track gesture progress
    document.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, { passive: false });

    // Touch end - finalize gesture
    document.addEventListener('touchend', (e) => {
      this.handleTouchEnd(e);
    }, { passive: false });

    // Touch cancel - cleanup
    document.addEventListener('touchcancel', (e) => {
      this.handleTouchCancel(e);
    }, { passive: false });
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(e) {
    const now = performance.now();
    this.gestureData.touches = Array.from(e.touches);
    this.gestureData.startTime = now;
    this.gestureData.lastTime = now;
    this.gestureData.target = e.target;
    
    if (e.touches.length === 1) {
      this.handleSingleTouchStart(e.touches[0], now);
    } else if (e.touches.length === 2) {
      this.handleMultiTouchStart(e.touches, now);
    }
    
    this.currentState = this.gestureStates.touching;
  }

  /**
   * Handle single touch start
   */
  handleSingleTouchStart(touch, timestamp) {
    const { clientX: x, clientY: y } = touch;
    
    this.gestureData.startCenter = { x, y };
    this.gestureData.currentCenter = { x, y };
    
    // Detect multi-tap
    const timeSinceLastTap = timestamp - this.gestureData.lastTapTime;
    if (timeSinceLastTap < 300) {
      this.gestureData.tapCount++;
    } else {
      this.gestureData.tapCount = 1;
    }
    
    // Setup long press detection
    this.gestureData.longPressTimer = setTimeout(() => {
      this.handleLongPress(touch);
    }, this.longPressDelay);
    
    // Trigger touch feedback
    this.triggerHapticFeedback('light');
  }

  /**
   * Handle multi-touch start
   */
  handleMultiTouchStart(touches, timestamp) {
    if (this.gestureData.longPressTimer) {
      clearTimeout(this.gestureData.longPressTimer);
      this.gestureData.longPressTimer = null;
    }
    
    const center = this.calculateCenter(touches);
    this.gestureData.startCenter = center;
    this.gestureData.currentCenter = center;
    
    if (touches.length === 2) {
      this.gestureData.startDistance = this.calculateDistance(touches[0], touches[1]);
      this.gestureData.currentDistance = this.gestureData.startDistance;
      this.gestureData.startAngle = this.calculateAngle(touches[0], touches[1]);
      this.gestureData.currentAngle = this.gestureData.startAngle;
    }
    
    this.currentState = this.gestureStates.gesturing;
    this.triggerHapticFeedback('medium');
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(e) {
    const now = performance.now();
    const deltaTime = now - this.gestureData.lastTime;
    
    // Clear long press timer on movement
    if (this.gestureData.longPressTimer) {
      clearTimeout(this.gestureData.longPressTimer);
      this.gestureData.longPressTimer = null;
    }
    
    this.gestureData.touches = Array.from(e.touches);
    this.gestureData.lastTime = now;
    
    if (e.touches.length === 1) {
      this.handleSingleTouchMove(e.touches[0], deltaTime);
    } else if (e.touches.length === 2) {
      this.handleMultiTouchMove(e.touches, deltaTime);
    }
    
    // Prevent default browser gestures for media elements
    const target = this.gestureData.target;
    if (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO' || 
                   target.closest('.zoomable') || target.closest('.media-viewer'))) {
      e.preventDefault();
    }
  }

  /**
   * Handle single touch move
   */
  handleSingleTouchMove(touch, deltaTime) {
    const { clientX: x, clientY: y } = touch;
    const oldCenter = this.gestureData.currentCenter;
    
    this.gestureData.currentCenter = { x, y };
    
    // Calculate velocity
    if (deltaTime > 0) {
      this.gestureData.velocity = {
        x: (x - oldCenter.x) / deltaTime,
        y: (y - oldCenter.y) / deltaTime
      };
    }
    
    // Detect swipe
    const deltaX = x - this.gestureData.startCenter.x;
    const deltaY = y - this.gestureData.startCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > this.swipeThreshold && this.currentState !== this.gestureStates.swiping) {
      this.currentState = this.gestureStates.swiping;
      this.gestureData.direction = this.calculateDirection(deltaX, deltaY);
      
      this.triggerGestureEvent('swipestart', {
        direction: this.gestureData.direction,
        distance,
        velocity: this.gestureData.velocity,
        target: this.gestureData.target
      });
    }
    
    if (this.currentState === this.gestureStates.swiping) {
      this.triggerGestureEvent('swipemove', {
        direction: this.gestureData.direction,
        distance,
        deltaX,
        deltaY,
        velocity: this.gestureData.velocity,
        target: this.gestureData.target
      });
    }
  }

  /**
   * Handle multi-touch move
   */
  handleMultiTouchMove(touches, deltaTime) {
    if (touches.length !== 2) return;
    
    const center = this.calculateCenter(touches);
    const distance = this.calculateDistance(touches[0], touches[1]);
    const angle = this.calculateAngle(touches[0], touches[1]);
    
    this.gestureData.currentCenter = center;
    this.gestureData.currentDistance = distance;
    this.gestureData.currentAngle = angle;
    
    // Calculate scale change
    const scaleChange = distance / this.gestureData.startDistance;
    this.gestureData.scale = scaleChange;
    
    // Calculate rotation change
    const rotationChange = angle - this.gestureData.startAngle;
    this.gestureData.rotation = rotationChange;
    
    // Detect pinch gesture
    if (Math.abs(scaleChange - 1) > this.pinchThreshold) {
      if (this.currentState !== this.gestureStates.pinching) {
        this.currentState = this.gestureStates.pinching;
        this.triggerGestureEvent('pinchstart', {
          scale: scaleChange,
          center,
          target: this.gestureData.target
        });
      }
      
      this.triggerGestureEvent('pinchmove', {
        scale: scaleChange,
        delta: scaleChange - 1,
        center,
        target: this.gestureData.target
      });
    }
    
    // Detect rotation gesture
    if (Math.abs(rotationChange) > this.rotationThreshold) {
      if (this.currentState !== this.gestureStates.rotating) {
        this.currentState = this.gestureStates.rotating;
        this.triggerGestureEvent('rotatestart', {
          rotation: rotationChange,
          center,
          target: this.gestureData.target
        });
      }
      
      this.triggerGestureEvent('rotatemove', {
        rotation: rotationChange,
        delta: rotationChange,
        center,
        target: this.gestureData.target
      });
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(e) {
    const now = performance.now();
    const duration = now - this.gestureData.startTime;
    
    // Clear long press timer
    if (this.gestureData.longPressTimer) {
      clearTimeout(this.gestureData.longPressTimer);
      this.gestureData.longPressTimer = null;
    }
    
    // Handle gesture completion based on current state
    switch (this.currentState) {
      case this.gestureStates.touching:
        this.handleTap(duration);
        break;
      case this.gestureStates.swiping:
        this.handleSwipeEnd(duration);
        break;
      case this.gestureStates.pinching:
        this.handlePinchEnd();
        break;
      case this.gestureStates.rotating:
        this.handleRotateEnd();
        break;
    }
    
    // Reset state if no touches remain
    if (e.touches.length === 0) {
      this.resetGestureState();
    }
  }

  /**
   * Handle tap gesture
   */
  handleTap(duration) {
    const distance = this.calculateDistance(
      this.gestureData.startCenter,
      this.gestureData.currentCenter
    );
    
    if (distance <= this.tapThreshold && duration < 500) {
      this.gestureData.lastTapTime = performance.now();
      
      const eventData = {
        tapCount: this.gestureData.tapCount,
        position: this.gestureData.currentCenter,
        target: this.gestureData.target,
        duration
      };
      
      if (this.gestureData.tapCount === 1) {
        setTimeout(() => {
          if (this.gestureData.tapCount === 1) {
            this.triggerGestureEvent('tap', eventData);
          }
        }, 250); // Wait for potential double tap
      } else if (this.gestureData.tapCount === 2) {
        this.triggerGestureEvent('doubletap', eventData);
      } else if (this.gestureData.tapCount >= 3) {
        this.triggerGestureEvent('multitap', eventData);
      }
      
      this.triggerHapticFeedback('light');
    }
  }

  /**
   * Handle swipe end
   */
  handleSwipeEnd(duration) {
    const deltaX = this.gestureData.currentCenter.x - this.gestureData.startCenter.x;
    const deltaY = this.gestureData.currentCenter.y - this.gestureData.startCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    this.triggerGestureEvent('swipeend', {
      direction: this.gestureData.direction,
      distance,
      duration,
      velocity: this.gestureData.velocity,
      deltaX,
      deltaY,
      target: this.gestureData.target
    });
    
    this.triggerHapticFeedback('medium');
  }

  /**
   * Handle pinch end
   */
  handlePinchEnd() {
    this.triggerGestureEvent('pinchend', {
      scale: this.gestureData.scale,
      finalScale: this.gestureData.scale,
      center: this.gestureData.currentCenter,
      target: this.gestureData.target
    });
  }

  /**
   * Handle rotation end
   */
  handleRotateEnd() {
    this.triggerGestureEvent('rotateend', {
      rotation: this.gestureData.rotation,
      finalRotation: this.gestureData.rotation,
      center: this.gestureData.currentCenter,
      target: this.gestureData.target
    });
  }

  /**
   * Handle long press
   */
  handleLongPress(touch) {
    this.triggerGestureEvent('longpress', {
      position: { x: touch.clientX, y: touch.clientY },
      target: this.gestureData.target,
      duration: this.longPressDelay
    });
    
    this.triggerHapticFeedback('heavy');
    this.showContextMenu(touch);
  }

  /**
   * Handle touch cancel
   */
  handleTouchCancel(e) {
    this.resetGestureState();
  }

  /**
   * Reset gesture state
   */
  resetGestureState() {
    if (this.gestureData.longPressTimer) {
      clearTimeout(this.gestureData.longPressTimer);
    }
    
    this.currentState = this.gestureStates.idle;
    this.gestureData = this.createGestureData();
  }

  /**
   * Setup accessibility features
   */
  setupAccessibilityFeatures() {
    // Enhanced focus management for touch devices
    document.addEventListener('focusin', (e) => {
      if (this.isTouch) {
        e.target.classList.add('touch-focused');
      }
    });
    
    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('touch-focused');
    });
    
    // Voice over support for gestures
    document.addEventListener('gesturestart', (e) => {
      if (window.speechSynthesis) {
        const announcement = this.createGestureAnnouncement(e.detail);
        if (announcement) {
          this.announceGesture(announcement);
        }
      }
    });
  }

  /**
   * Setup context menus for long press
   */
  setupContextMenus() {
    this.contextMenus = new Map();
    
    // Default context menu for images
    this.registerContextMenu('img', [
      { label: 'View Full Size', action: 'viewFullSize' },
      { label: 'Download', action: 'download' },
      { label: 'Share', action: 'share' }
    ]);
    
    // Default context menu for text
    this.registerContextMenu('[data-text-selectable]', [
      { label: 'Copy', action: 'copy' },
      { label: 'Select All', action: 'selectAll' },
      { label: 'Share', action: 'share' }
    ]);
  }

  /**
   * Register context menu for element selector
   */
  registerContextMenu(selector, items) {
    this.contextMenus.set(selector, items);
  }

  /**
   * Show context menu
   */
  showContextMenu(touch) {
    const target = this.gestureData.target;
    let menuItems = null;
    
    // Find matching context menu
    for (const [selector, items] of this.contextMenus) {
      if (target.matches && target.matches(selector)) {
        menuItems = items;
        break;
      }
    }
    
    if (menuItems) {
      this.triggerGestureEvent('contextmenu', {
        position: { x: touch.clientX, y: touch.clientY },
        target,
        items: menuItems
      });
    }
  }

  /**
   * Utility: Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Utility: Calculate center point of touches
   */
  calculateCenter(touches) {
    let x = 0, y = 0;
    for (const touch of touches) {
      x += touch.clientX;
      y += touch.clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
  }

  /**
   * Utility: Calculate angle between two touches
   */
  calculateAngle(touch1, touch2) {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI;
  }

  /**
   * Utility: Calculate swipe direction
   */
  calculateDirection(deltaX, deltaY) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Trigger haptic feedback
   */
  triggerHapticFeedback(intensity = 'light') {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100]
    };
    
    navigator.vibrate(patterns[intensity] || patterns.light);
  }

  /**
   * Trigger gesture event
   */
  triggerGestureEvent(type, detail) {
    const event = new CustomEvent(`gesture${type}`, {
      detail: { ...detail, timestamp: performance.now() }
    });
    
    if (detail.target) {
      detail.target.dispatchEvent(event);
    }
    
    document.dispatchEvent(event);
    
    // Store in gesture history
    this.gestureHistory.push({
      type,
      detail,
      timestamp: performance.now()
    });
    
    // Limit history size
    if (this.gestureHistory.length > 100) {
      this.gestureHistory.shift();
    }
  }

  /**
   * Create gesture announcement for accessibility
   */
  createGestureAnnouncement(gestureDetail) {
    const { type } = gestureDetail;
    
    const announcements = {
      'tap': 'Button activated',
      'doubletap': 'Double tap detected',
      'longpress': 'Context menu available',
      'swipe': `Swiped ${gestureDetail.direction}`,
      'pinch': 'Zoom gesture detected',
      'rotate': 'Rotation gesture detected'
    };
    
    return announcements[type];
  }

  /**
   * Announce gesture for screen readers
   */
  announceGesture(text) {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 0.3;
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Get gesture analytics
   */
  getGestureAnalytics() {
    const recentGestures = this.gestureHistory.slice(-50);
    const gestureTypes = {};
    
    recentGestures.forEach(gesture => {
      gestureTypes[gesture.type] = (gestureTypes[gesture.type] || 0) + 1;
    });
    
    return {
      totalGestures: this.gestureHistory.length,
      recentGestures: recentGestures.length,
      gestureTypes,
      currentState: this.currentState
    };
  }

  /**
   * Enable/disable gesture detection
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (!enabled) {
      this.resetGestureState();
    }
  }

  /**
   * Destroy the service
   */
  destroy() {
    this.resetGestureState();
    this.gestureHistory = [];
    this.activeGestures.clear();
    this.contextMenus.clear();
  }
}

// CSS for gesture feedback
const gestureCSS = `
/* Gesture Feedback Styles */
.touch-focused {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.touch-active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}

.gesture-target {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.zoomable {
  touch-action: pan-x pan-y;
  cursor: grab;
}

.zoomable.zoomed {
  cursor: grabbing;
}

.swipeable {
  touch-action: pan-y;
}

.no-touch-action {
  touch-action: none;
}

/* Context menu styles */
.gesture-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 10000;
  min-width: 150px;
}

.gesture-context-menu-item {
  padding: 12px 16px;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-size: 14px;
}

.gesture-context-menu-item:hover {
  background: #f3f4f6;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .touch-active {
    transform: none;
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .touch-focused {
    outline-color: HighlightText;
    outline-width: 3px;
  }
}
`;

// Inject CSS
function injectGestureStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = gestureCSS;
  document.head.appendChild(styleElement);
}

// Auto-initialize
if (typeof document !== 'undefined') {
  injectGestureStyles();
}

// Create singleton instance
const advancedGestureService = new AdvancedTouchGestureService();

export default advancedGestureService;
export { AdvancedTouchGestureService };