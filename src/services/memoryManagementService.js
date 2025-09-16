// Memory Management Service
class MemoryManagementService {
  constructor() {
    this.memoryThreshold = 0.8; // 80% of available memory
    this.cleanupCallbacks = [];
    this.memoryPressureListeners = [];
    this.cacheManagers = new Map();
    this.isMonitoring = false;
  }

  init() {
    if (this.isMonitoring) return;
    
    if (performance.memory) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    this.isMonitoring = true;
    
    // Check memory every 30 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
  }

  checkMemoryUsage() {
    if (!performance.memory) return;
    
    const memoryInfo = performance.memory;
    const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
    
    if (usageRatio > this.memoryThreshold) {
      this.triggerCleanup();
    }
  }

  triggerCleanup() {
    // Run cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Memory cleanup callback failed:', error);
      }
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  addCleanupCallback(callback) {
    this.cleanupCallbacks.push(callback);
  }

  removeCleanupCallback(callback) {
    const index = this.cleanupCallbacks?.indexOf?.(callback) ?? -1;
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  getMemoryStats() {
    if (!performance.memory) {
      return { supported: false };
    }
    
    const memoryInfo = performance.memory;
    return {
      supported: true,
      used: memoryInfo.usedJSHeapSize,
      total: memoryInfo.totalJSHeapSize,
      limit: memoryInfo.jsHeapSizeLimit,
      usageRatio: memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit
    };
  }

  optimizeMemory() {
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old') || name.includes('temp')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // Clear large objects from memory
    this.triggerCleanup();
  }

  registerCacheManager(name, manager) {
    this.cacheManagers.set(name, manager);
  }

  addMemoryPressureListener(listener) {
    this.memoryPressureListeners.push(listener);
  }

  triggerMemoryPressure() {
    this.memoryPressureListeners.forEach(listener => {
      try {
        listener({ type: 'memory-pressure', timestamp: Date.now() });
      } catch (error) {
        console.warn('Memory pressure listener failed:', error);
      }
    });
  }
}

export default new MemoryManagementService();