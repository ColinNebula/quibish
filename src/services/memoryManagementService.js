/**
 * Memory Management Service for Mobile Performance
 * Handles memory optimization, garbage collection hints, and low-memory scenarios
 */

class MemoryManagementService {
  constructor() {
    this.memoryThresholds = {
      critical: 50 * 1024 * 1024,    // 50MB
      warning: 100 * 1024 * 1024,   // 100MB
      optimal: 200 * 1024 * 1024    // 200MB
    };
    
    this.memoryUsage = {
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0,
      usedJSHeapSize: 0
    };
    
    this.memoryObserver = null;
    this.monitoringInterval = null;
    this.lastCleanup = Date.now();
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    this.cacheManagers = new Map();
    this.eventListeners = new Map();
    
    this.init();
  }

  /**
   * Initialize memory management service
   */
  init() {
    this.setupMemoryMonitoring();
    this.setupMemoryObserver();
    this.setupLowMemoryHandling();
    this.setupPeriodicCleanup();
    
    console.log('🧠 Memory Management Service initialized');
    this.logMemoryStatus();
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if (!this.isPerformanceMemorySupported()) {
      console.warn('Performance memory API not supported');
      return;
    }

    // Monitor memory usage every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryUsage();
      this.checkMemoryThresholds();
    }, 30000);

    // Initial update
    this.updateMemoryUsage();
  }

  /**
   * Setup memory pressure observer
   */
  setupMemoryObserver() {
    if ('memory' in performance && 'addEventListener' in performance.memory) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'memory') {
              this.handleMemoryPressure(entry);
            }
          });
        });
        
        this.memoryObserver.observe({ entryTypes: ['memory'] });
      } catch (error) {
        console.warn('Memory observer not supported:', error);
      }
    }
  }

  /**
   * Setup low memory event handling
   */
  setupLowMemoryHandling() {
    // Listen for memory pressure events (where available)
    if ('onmemorywarning' in window) {
      window.addEventListener('memorywarning', () => {
        this.handleLowMemory();
      });
    }

    // Listen for page visibility changes to trigger cleanup
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performBackgroundCleanup();
      }
    });

    // Listen for beforeunload to cleanup
    window.addEventListener('beforeunload', () => {
      this.performFinalCleanup();
    });
  }

  /**
   * Setup periodic cleanup
   */
  setupPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastCleanup > this.cleanupInterval) {
        this.performPeriodicCleanup();
        this.lastCleanup = now;
      }
    }, 60000); // Check every minute
  }

  /**
   * Update memory usage information
   */
  updateMemoryUsage() {
    if (!this.isPerformanceMemorySupported()) return;

    try {
      const memory = performance.memory;
      this.memoryUsage = {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize
      };
    } catch (error) {
      console.warn('Failed to update memory usage:', error);
    }
  }

  /**
   * Check memory thresholds and take action
   */
  checkMemoryThresholds() {
    const usedMemory = this.memoryUsage.usedJSHeapSize;
    
    if (usedMemory > this.memoryThresholds.critical) {
      this.handleCriticalMemory();
    } else if (usedMemory > this.memoryThresholds.warning) {
      this.handleMemoryWarning();
    }
  }

  /**
   * Handle memory pressure events
   */
  handleMemoryPressure(entry) {
    console.log('🚨 Memory pressure detected:', entry);
    
    // Perform aggressive cleanup
    this.performAggressiveCleanup();
    
    // Notify components
    this.notifyMemoryPressure(entry.level || 'high');
  }

  /**
   * Handle low memory situations
   */
  handleLowMemory() {
    console.log('🚨 Low memory warning');
    
    // Clear caches
    this.clearAllCaches();
    
    // Remove event listeners for non-critical features
    this.removeNonCriticalListeners();
    
    // Force garbage collection if available
    this.forceGarbageCollection();
    
    // Notify components to reduce memory usage
    this.notifyLowMemory();
  }

  /**
   * Handle critical memory situations
   */
  handleCriticalMemory() {
    console.log('🔴 Critical memory usage detected');
    
    this.handleLowMemory();
    
    // Additional critical measures
    this.reduceFunctionality();
    this.clearLargeAssets();
  }

  /**
   * Handle memory warning situations
   */
  handleMemoryWarning() {
    console.log('🟡 Memory warning detected');
    
    // Gentle cleanup
    this.performGentleCleanup();
    
    // Optimize ongoing operations
    this.optimizeOperations();
  }

  /**
   * Perform periodic cleanup
   */
  performPeriodicCleanup() {
    console.log('🧹 Performing periodic memory cleanup');
    
    // Clean up expired cache entries
    this.cleanupExpiredCaches();
    
    // Remove unused event listeners
    this.cleanupEventListeners();
    
    // Clear old performance entries
    this.clearPerformanceEntries();
    
    // Cleanup component references
    this.cleanupComponentReferences();
  }

  /**
   * Perform background cleanup when page is hidden
   */
  performBackgroundCleanup() {
    console.log('🌙 Performing background cleanup');
    
    // More aggressive cleanup when page is not visible
    this.clearNonEssentialCaches();
    this.pauseNonCriticalOperations();
    this.cleanupDOMReferences();
  }

  /**
   * Perform final cleanup before page unload
   */
  performFinalCleanup() {
    console.log('👋 Performing final cleanup');
    
    // Clear all intervals and timeouts
    this.clearAllTimers();
    
    // Remove all event listeners
    this.removeAllEventListeners();
    
    // Clear all caches
    this.clearAllCaches();
    
    // Disconnect observers
    this.disconnectObservers();
  }

  /**
   * Perform gentle cleanup
   */
  performGentleCleanup() {
    // Clean up LRU caches
    this.cleanupLRUCaches();
    
    // Remove old temporary data
    this.clearTemporaryData();
    
    // Optimize image caches
    this.optimizeImageCaches();
  }

  /**
   * Perform aggressive cleanup
   */
  performAggressiveCleanup() {
    this.performGentleCleanup();
    
    // Clear component caches
    this.clearComponentCaches();
    
    // Remove cached DOM references
    this.clearDOMReferences();
    
    // Clear service worker caches if needed
    this.clearServiceWorkerCaches();
  }

  /**
   * Register cache manager
   */
  registerCacheManager(name, manager) {
    this.cacheManagers.set(name, manager);
  }

  /**
   * Clean up expired caches
   */
  cleanupExpiredCaches() {
    this.cacheManagers.forEach((manager, name) => {
      try {
        if (manager.cleanup) {
          manager.cleanup();
        }
      } catch (error) {
        console.warn(`Failed to cleanup cache ${name}:`, error);
      }
    });
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.cacheManagers.forEach((manager, name) => {
      try {
        if (manager.clear) {
          manager.clear();
        }
      } catch (error) {
        console.warn(`Failed to clear cache ${name}:`, error);
      }
    });

    // Clear browser caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('temp') || cacheName.includes('dynamic')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  }

  /**
   * Clear large assets
   */
  clearLargeAssets() {
    // Remove large images from DOM
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.naturalWidth > 1920 || img.naturalHeight > 1080) {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
      }
    });

    // Clear video elements
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.paused) {
        video.pause();
      }
      video.removeAttribute('src');
      video.load();
    });
  }

  /**
   * Reduce functionality in critical memory situations
   */
  reduceFunctionality() {
    // Disable animations
    document.documentElement.style.setProperty('--animation-duration', '0s');
    
    // Disable auto-refresh
    this.notifyComponents('disable-auto-refresh');
    
    // Reduce update frequency
    this.notifyComponents('reduce-update-frequency');
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (window.gc) {
      try {
        window.gc();
        console.log('♻️ Forced garbage collection');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    }
  }

  /**
   * Clean up event listeners
   */
  cleanupEventListeners() {
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (error) {
          console.warn('Failed to remove event listener:', error);
        }
      });
    });
    
    this.eventListeners.clear();
  }

  /**
   * Remove non-critical event listeners
   */
  removeNonCriticalListeners() {
    // Remove hover effects
    const elements = document.querySelectorAll('[data-hover]');
    elements.forEach(element => {
      element.removeAttribute('data-hover');
    });

    // Remove tooltip listeners
    this.notifyComponents('disable-tooltips');
  }

  /**
   * Clear performance entries
   */
  clearPerformanceEntries() {
    if ('performance' in window && 'clearMarks' in performance) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Optimize ongoing operations
   */
  optimizeOperations() {
    // Reduce animation frame rate
    this.notifyComponents('reduce-animation-rate');
    
    // Increase debounce delays
    this.notifyComponents('increase-debounce');
    
    // Reduce polling frequency
    this.notifyComponents('reduce-polling');
  }

  /**
   * Notify components of memory events
   */
  notifyComponents(event, data = {}) {
    const customEvent = new CustomEvent(`memory-${event}`, {
      detail: { ...data, memoryUsage: this.memoryUsage }
    });
    document.dispatchEvent(customEvent);
  }

  /**
   * Notify memory pressure
   */
  notifyMemoryPressure(level) {
    this.notifyComponents('pressure', { level });
  }

  /**
   * Notify low memory
   */
  notifyLowMemory() {
    this.notifyComponents('low', {
      usedMemory: this.memoryUsage.usedJSHeapSize,
      threshold: this.memoryThresholds.warning
    });
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage() {
    const { usedJSHeapSize, jsHeapSizeLimit } = this.memoryUsage;
    return jsHeapSizeLimit > 0 ? (usedJSHeapSize / jsHeapSizeLimit) * 100 : 0;
  }

  /**
   * Get memory status
   */
  getMemoryStatus() {
    const usedMemory = this.memoryUsage.usedJSHeapSize;
    
    if (usedMemory > this.memoryThresholds.critical) {
      return 'critical';
    } else if (usedMemory > this.memoryThresholds.warning) {
      return 'warning';
    } else {
      return 'optimal';
    }
  }

  /**
   * Log memory status
   */
  logMemoryStatus() {
    if (!this.isPerformanceMemorySupported()) return;

    const { usedJSHeapSize, jsHeapSizeLimit } = this.memoryUsage;
    const usedMB = (usedJSHeapSize / 1024 / 1024).toFixed(2);
    const limitMB = (jsHeapSizeLimit / 1024 / 1024).toFixed(2);
    const percentage = this.getMemoryUsagePercentage().toFixed(1);
    
    console.log(`💾 Memory: ${usedMB}MB / ${limitMB}MB (${percentage}%)`);
  }

  /**
   * Check if performance.memory is supported
   */
  isPerformanceMemorySupported() {
    return 'performance' in window && 'memory' in performance;
  }

  /**
   * Get memory metrics for monitoring
   */
  getMemoryMetrics() {
    return {
      ...this.memoryUsage,
      usagePercentage: this.getMemoryUsagePercentage(),
      status: this.getMemoryStatus(),
      thresholds: this.memoryThresholds,
      isSupported: this.isPerformanceMemorySupported()
    };
  }

  /**
   * Set memory thresholds
   */
  setMemoryThresholds(thresholds) {
    this.memoryThresholds = { ...this.memoryThresholds, ...thresholds };
  }

  /**
   * Add memory pressure listener
   */
  addMemoryPressureListener(callback) {
    document.addEventListener('memory-pressure', callback);
    return () => document.removeEventListener('memory-pressure', callback);
  }

  /**
   * Add low memory listener
   */
  addLowMemoryListener(callback) {
    document.addEventListener('memory-low', callback);
    return () => document.removeEventListener('memory-low', callback);
  }

  /**
   * Clean up service
   */
  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
      this.memoryObserver = null;
    }

    this.performFinalCleanup();
  }

  // Placeholder methods for specific cleanup operations
  cleanupLRUCaches() { /* Implementation specific to LRU caches */ }
  clearTemporaryData() { /* Clear temporary application data */ }
  optimizeImageCaches() { /* Optimize image cache sizes */ }
  clearComponentCaches() { /* Clear React component caches */ }
  clearDOMReferences() { /* Clear DOM element references */ }
  clearServiceWorkerCaches() { /* Clear service worker caches */ }
  clearNonEssentialCaches() { /* Clear non-essential caches */ }
  pauseNonCriticalOperations() { /* Pause background operations */ }
  cleanupDOMReferences() { /* Clean up DOM references */ }
  clearAllTimers() { /* Clear all timers and intervals */ }
  removeAllEventListeners() { /* Remove all event listeners */ }
  disconnectObservers() { /* Disconnect all observers */ }
  cleanupComponentReferences() { /* Clean up component references */ }
}

// Create singleton instance
const memoryManager = new MemoryManagementService();

// Export for use in components
export default memoryManager;
export { MemoryManagementService };