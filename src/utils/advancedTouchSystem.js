/**
 * Advanced Touch and Haptic Feedback System
 * Modern touch interactions for latest smartphones
 * Supports: Haptic Feedback API, precision touchpads, pull-to-refresh, momentum scrolling
 */

// Haptic feedback patterns for different interactions
const HapticPatterns = {
  // Light feedback for subtle interactions
  light: [10],
  
  // Medium feedback for button presses
  medium: [20, 10, 20],
  
  // Heavy feedback for important actions
  heavy: [50, 25, 50],
  
  // Success pattern
  success: [20, 10, 20, 10, 30],
  
  // Error pattern
  error: [100, 50, 100, 50, 100],
  
  // Notification pattern
  notification: [30, 20, 30],
  
  // Selection pattern
  selection: [15],
  
  // Long press pattern
  longPress: [40, 20, 40],
  
  // Swipe pattern
  swipe: [25, 15, 25],
  
  // Pull refresh pattern
  pullRefresh: [30, 20, 30, 20, 50]
};

// Modern Haptic Feedback Manager
class HapticFeedbackManager {
  constructor() {
    this.isSupported = this.checkSupport();
    this.isEnabled = true;
    this.intensity = 1.0; // 0.0 to 1.0
    this.lastFeedbackTime = 0;
    this.throttleDelay = 50; // Minimum time between feedback in ms
  }

  // Check haptic feedback support
  checkSupport() {
    return 'vibrate' in navigator || 
           'hapticFeedback' in navigator ||
           (window.DeviceMotionEvent && window.DeviceMotionEvent.requestPermission);
  }

  // Enable/disable haptic feedback
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('haptic-feedback-enabled', JSON.stringify(enabled));
  }

  // Set feedback intensity
  setIntensity(intensity) {
    this.intensity = Math.max(0, Math.min(1, intensity));
    localStorage.setItem('haptic-feedback-intensity', intensity.toString());
  }

  // Throttle feedback to prevent overwhelming
  shouldTriggerFeedback() {
    const now = performance.now();
    if (now - this.lastFeedbackTime < this.throttleDelay) {
      return false;
    }
    this.lastFeedbackTime = now;
    return true;
  }

  // Trigger haptic feedback
  trigger(pattern = 'light', options = {}) {
    if (!this.isEnabled || !this.isSupported || !this.shouldTriggerFeedback()) {
      return false;
    }

    const feedbackPattern = typeof pattern === 'string' 
      ? HapticPatterns[pattern] || HapticPatterns.light
      : pattern;

    // Apply intensity scaling
    const scaledPattern = feedbackPattern.map(duration => 
      Math.round(duration * this.intensity)
    );

    try {
      // Try modern Haptic Feedback API first
      if (navigator.hapticFeedback) {
        navigator.hapticFeedback.vibrate(scaledPattern);
        return true;
      }
      
      // Fallback to vibration API
      if (navigator.vibrate) {
        navigator.vibrate(scaledPattern);
        return true;
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }

    return false;
  }

  // Contextual feedback helpers
  selection() { return this.trigger('selection'); }
  buttonPress() { return this.trigger('medium'); }
  success() { return this.trigger('success'); }
  error() { return this.trigger('error'); }
  notification() { return this.trigger('notification'); }
  longPress() { return this.trigger('longPress'); }
  swipe() { return this.trigger('swipe'); }
  pullRefresh() { return this.trigger('pullRefresh'); }
}

// Advanced Touch Gesture Recognition
class AdvancedTouchManager {
  constructor() {
    this.gestures = new Map();
    this.activeGestures = new Set();
    this.touchHistory = [];
    this.maxHistoryLength = 100;
    
    // Touch thresholds
    this.swipeThreshold = 30;
    this.velocityThreshold = 0.3;
    this.longPressDelay = 500;
    this.doubleTapDelay = 300;
    
    // Performance tracking
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
  }

  // Register a gesture handler
  registerGesture(name, handler, options = {}) {
    this.gestures.set(name, { handler, options });
  }

  // Calculate touch velocity
  calculateVelocity(currentTouch, previousTouch, deltaTime) {
    if (!previousTouch || deltaTime === 0) return { x: 0, y: 0 };
    
    const deltaX = currentTouch.clientX - previousTouch.clientX;
    const deltaY = currentTouch.clientY - previousTouch.clientY;
    
    return {
      x: deltaX / deltaTime,
      y: deltaY / deltaTime
    };
  }

  // Advanced swipe detection with momentum
  detectSwipe(touches, velocities) {
    if (touches.length !== 2) return null;
    
    const [start, end] = touches;
    const deltaX = end.clientX - start.clientX;
    const deltaY = end.clientY - start.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < this.swipeThreshold) return null;
    
    const velocity = velocities[velocities.length - 1];
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    if (speed < this.velocityThreshold) return null;
    
    // Determine direction
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    let direction;
    
    if (angle >= -45 && angle <= 45) direction = 'right';
    else if (angle >= 45 && angle <= 135) direction = 'down';
    else if (angle >= -135 && angle <= -45) direction = 'up';
    else direction = 'left';
    
    return {
      direction,
      distance,
      velocity: speed,
      angle,
      momentum: speed > this.velocityThreshold * 2
    };
  }

  // Handle touch events with performance optimization
  handleTouch(event) {
    const now = performance.now();
    
    // Throttle events to maintain 60fps
    if (now - this.lastFrameTime < this.frameInterval) {
      return;
    }
    this.lastFrameTime = now;
    
    const touches = Array.from(event.touches || [event]);
    const touchData = {
      timestamp: now,
      touches: touches.map(touch => ({
        clientX: touch.clientX,
        clientY: touch.clientY,
        identifier: touch.identifier || 0
      })),
      type: event.type
    };
    
    // Add to history
    this.touchHistory.push(touchData);
    if (this.touchHistory.length > this.maxHistoryLength) {
      this.touchHistory.shift();
    }
    
    // Process gestures
    this.processGestures(touchData);
  }

  // Process gesture recognition
  processGestures(touchData) {
    const { touches, timestamp, type } = touchData;
    
    // Calculate velocities
    const velocities = this.calculateTouchVelocities();
    
    // Detect swipes
    if (type === 'touchend' && this.touchHistory.length >= 2) {
      const swipe = this.detectSwipe(
        [this.touchHistory[0].touches[0], touches[0]], 
        velocities
      );
      
      if (swipe) {
        this.triggerGesture('swipe', { ...swipe, touches });
      }
    }
    
    // Detect long press
    if (type === 'touchstart') {
      setTimeout(() => {
        if (this.activeGestures.has('longpress')) {
          this.triggerGesture('longpress', { touches, timestamp });
        }
      }, this.longPressDelay);
      this.activeGestures.add('longpress');
    }
    
    if (type === 'touchend') {
      this.activeGestures.delete('longpress');
    }
  }

  // Calculate touch velocities over time
  calculateTouchVelocities() {
    const velocities = [];
    
    for (let i = 1; i < this.touchHistory.length; i++) {
      const current = this.touchHistory[i];
      const previous = this.touchHistory[i - 1];
      const deltaTime = current.timestamp - previous.timestamp;
      
      if (current.touches[0] && previous.touches[0]) {
        const velocity = this.calculateVelocity(
          current.touches[0], 
          previous.touches[0], 
          deltaTime
        );
        velocities.push(velocity);
      }
    }
    
    return velocities;
  }

  // Trigger gesture event
  triggerGesture(name, data) {
    const gesture = this.gestures.get(name);
    if (gesture) {
      try {
        gesture.handler(data);
      } catch (error) {
        console.error(`Gesture handler error for ${name}:`, error);
      }
    }
    
    // Dispatch custom event
    const event = new CustomEvent(`advanced-${name}`, { 
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

// Pull-to-Refresh Implementation
class PullToRefreshManager {
  constructor(container, onRefresh) {
    this.container = container;
    this.onRefresh = onRefresh;
    this.isEnabled = true;
    this.threshold = 70;
    this.maxDistance = 120;
    this.isRefreshing = false;
    this.startY = 0;
    this.currentY = 0;
    this.isDragging = false;
    
    this.createRefreshElement();
    this.bindEvents();
  }

  createRefreshElement() {
    this.refreshElement = document.createElement('div');
    this.refreshElement.className = 'pull-refresh-indicator';
    this.refreshElement.innerHTML = `
      <div class="pull-refresh-spinner">
        <div class="pull-refresh-icon">↓</div>
        <div class="pull-refresh-text">Pull to refresh</div>
      </div>
    `;
    
    // Insert at the beginning of container
    this.container.insertBefore(this.refreshElement, this.container.firstChild);
  }

  bindEvents() {
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  handleTouchStart(event) {
    if (!this.isEnabled || this.isRefreshing) return;
    
    // Only start if scrolled to top
    if (this.container.scrollTop > 0) return;
    
    this.startY = event.touches[0].clientY;
    this.isDragging = true;
  }

  handleTouchMove(event) {
    if (!this.isDragging || this.isRefreshing) return;
    
    this.currentY = event.touches[0].clientY;
    const distance = Math.max(0, this.currentY - this.startY);
    
    if (distance > 0 && this.container.scrollTop === 0) {
      event.preventDefault();
      
      const clampedDistance = Math.min(distance, this.maxDistance);
      const progress = clampedDistance / this.threshold;
      
      this.updateRefreshIndicator(clampedDistance, progress);
    }
  }

  handleTouchEnd() {
    if (!this.isDragging || this.isRefreshing) return;
    
    const distance = Math.max(0, this.currentY - this.startY);
    
    if (distance >= this.threshold) {
      this.triggerRefresh();
    } else {
      this.resetRefreshIndicator();
    }
    
    this.isDragging = false;
  }

  updateRefreshIndicator(distance, progress) {
    const rotation = Math.min(progress * 180, 180);
    const opacity = Math.min(progress, 1);
    
    this.refreshElement.style.transform = `translateY(${distance - 50}px)`;
    this.refreshElement.style.opacity = opacity;
    
    const icon = this.refreshElement.querySelector('.pull-refresh-icon');
    icon.style.transform = `rotate(${rotation}deg)`;
    
    const text = this.refreshElement.querySelector('.pull-refresh-text');
    text.textContent = progress >= 1 ? 'Release to refresh' : 'Pull to refresh';
  }

  async triggerRefresh() {
    this.isRefreshing = true;
    
    // Show loading state
    this.refreshElement.classList.add('refreshing');
    this.refreshElement.style.transform = 'translateY(0)';
    
    const icon = this.refreshElement.querySelector('.pull-refresh-icon');
    const text = this.refreshElement.querySelector('.pull-refresh-text');
    
    icon.textContent = '⟳';
    icon.style.animation = 'spin 1s linear infinite';
    text.textContent = 'Refreshing...';
    
    // Trigger haptic feedback
    if (window.hapticManager) {
      window.hapticManager.pullRefresh();
    }
    
    try {
      await this.onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => {
        this.resetRefreshIndicator();
        this.isRefreshing = false;
      }, 1000);
    }
  }

  resetRefreshIndicator() {
    this.refreshElement.classList.remove('refreshing');
    this.refreshElement.style.transform = 'translateY(-50px)';
    this.refreshElement.style.opacity = '0';
    
    const icon = this.refreshElement.querySelector('.pull-refresh-icon');
    const text = this.refreshElement.querySelector('.pull-refresh-text');
    
    icon.textContent = '↓';
    icon.style.animation = '';
    icon.style.transform = 'rotate(0deg)';
    text.textContent = 'Pull to refresh';
  }
}

// Precision Touchpad Support
class PrecisionTouchpadManager {
  constructor() {
    this.isSupported = this.checkSupport();
    this.scrollSensitivity = 1.0;
    this.gestureCallbacks = new Map();
  }

  checkSupport() {
    // Check for precision touchpad features
    return 'onwheel' in window && 
           'TouchEvent' in window &&
           CSS.supports('scroll-behavior', 'smooth');
  }

  // Enhanced wheel event handling for precision touchpads
  handleWheel(event) {
    if (!this.isSupported) return;
    
    const { deltaX, deltaY, deltaMode, ctrlKey, shiftKey } = event;
    
    // Detect precision vs mouse wheel
    const isPrecisionTouchpad = Math.abs(deltaY) < 100 && deltaMode === 0;
    
    if (isPrecisionTouchpad) {
      // Handle precision touchpad gestures
      if (ctrlKey) {
        // Zoom gesture
        this.triggerGesture('zoom', { 
          delta: deltaY * this.scrollSensitivity,
          event 
        });
        event.preventDefault();
      } else if (shiftKey) {
        // Horizontal scroll
        this.triggerGesture('horizontalScroll', { 
          delta: deltaX * this.scrollSensitivity,
          event 
        });
      }
    }
  }

  triggerGesture(name, data) {
    const callback = this.gestureCallbacks.get(name);
    if (callback) {
      callback(data);
    }
  }

  registerGesture(name, callback) {
    this.gestureCallbacks.set(name, callback);
  }
}

// Initialize all touch and haptic systems
export const initAdvancedTouch = () => {
  console.log('🎯 Initializing advanced touch and haptic systems...');
  
  // Initialize haptic feedback
  const hapticManager = new HapticFeedbackManager();
  window.hapticManager = hapticManager;
  
  // Initialize touch manager
  const touchManager = new AdvancedTouchManager();
  
  // Initialize precision touchpad
  const touchpadManager = new PrecisionTouchpadManager();
  
  // Set up global touch event handlers
  document.addEventListener('touchstart', (e) => touchManager.handleTouch(e), { passive: false });
  document.addEventListener('touchmove', (e) => touchManager.handleTouch(e), { passive: false });
  document.addEventListener('touchend', (e) => touchManager.handleTouch(e), { passive: false });
  
  // Set up wheel events for precision touchpads
  document.addEventListener('wheel', (e) => touchpadManager.handleWheel(e), { passive: false });
  
  // Add haptic feedback to common UI elements
  document.addEventListener('click', (event) => {
    if (event.target.matches('button, .btn, .touch-target')) {
      hapticManager.buttonPress();
    }
  });
  
  // Long press detection
  let longPressTimer;
  document.addEventListener('touchstart', (event) => {
    if (event.target.matches('.long-press-target')) {
      longPressTimer = setTimeout(() => {
        hapticManager.longPress();
        event.target.dispatchEvent(new CustomEvent('longpress', { bubbles: true }));
      }, 500);
    }
  });
  
  document.addEventListener('touchend', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });
  
  console.log('✅ Advanced touch and haptic systems initialized');
  
  return {
    hapticManager,
    touchManager,
    touchpadManager
  };
};

// Export managers and utilities
export {
  HapticFeedbackManager,
  AdvancedTouchManager,
  PullToRefreshManager,
  PrecisionTouchpadManager,
  HapticPatterns
};

export default {
  initAdvancedTouch,
  HapticFeedbackManager,
  AdvancedTouchManager,
  PullToRefreshManager,
  PrecisionTouchpadManager
};