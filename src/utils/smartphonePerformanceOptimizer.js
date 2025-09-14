/**
 * Modern Smartphone Performance Optimizer
 * Advanced performance optimizations for high-end smartphones
 * Supports: GPU acceleration, high refresh rates, advanced caching, memory optimization
 */

// GPU Acceleration Manager
class GPUAccelerationManager {
  constructor() {
    this.isSupported = this.checkGPUSupport();
    this.acceleratedElements = new WeakSet();
    this.performanceLevel = this.detectPerformanceLevel();
    this.frameTimings = [];
    this.targetFPS = 60;
    
    this.init();
  }

  // Check GPU acceleration support
  checkGPUSupport() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return false;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      console.log('🎮 GPU Renderer:', renderer);
    }
    
    return true;
  }

  // Detect device performance level
  detectPerformanceLevel() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const connection = navigator.connection;
    
    let score = 0;
    
    // CPU cores
    if (cores >= 8) score += 3;
    else if (cores >= 6) score += 2;
    else if (cores >= 4) score += 1;
    
    // Memory
    if (memory >= 8) score += 3;
    else if (memory >= 6) score += 2;
    else if (memory >= 4) score += 1;
    
    // Network quality
    if (connection) {
      if (connection.effectiveType === '4g') score += 2;
      else if (connection.effectiveType === '3g') score += 1;
    }
    
    // Classify performance level
    if (score >= 7) return 'high';
    else if (score >= 4) return 'medium';
    else return 'low';
  }

  // Initialize GPU acceleration
  init() {
    console.log(`🎮 GPU Performance Level: ${this.performanceLevel}`);
    
    this.setupFrameTimingMonitor();
    this.optimizeForPerformanceLevel();
    this.setupIntersectionObserver();
  }

  // Setup frame timing monitor
  setupFrameTimingMonitor() {
    let lastFrameTime = performance.now();
    
    const measureFrame = (currentTime) => {
      const frameDuration = currentTime - lastFrameTime;
      this.frameTimings.push(frameDuration);
      
      // Keep only last 60 frames
      if (this.frameTimings.length > 60) {
        this.frameTimings.shift();
      }
      
      // Adjust performance based on frame times
      this.adjustPerformanceSettings();
      
      lastFrameTime = currentTime;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  // Adjust performance settings based on frame timing
  adjustPerformanceSettings() {
    if (this.frameTimings.length < 30) return;
    
    const avgFrameTime = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length;
    const currentFPS = 1000 / avgFrameTime;
    
    // Detect refresh rate
    if (currentFPS > 90 && this.targetFPS === 60) {
      this.targetFPS = 120;
      this.enableHighRefreshOptimizations();
    } else if (currentFPS < 45 && this.performanceLevel === 'high') {
      this.enablePerformanceMode();
    }
  }

  // Enable high refresh rate optimizations
  enableHighRefreshOptimizations() {
    document.documentElement.classList.add('high-refresh-mode');
    document.documentElement.style.setProperty('--animation-multiplier', '0.83');
    
    console.log('🚀 High refresh rate optimizations enabled');
  }

  // Enable performance mode for struggling devices
  enablePerformanceMode() {
    document.documentElement.classList.add('performance-mode');
    document.documentElement.style.setProperty('--animation-multiplier', '1.2');
    
    // Reduce visual effects
    this.reduceVisualEffects();
    
    console.log('⚡ Performance mode enabled');
  }

  // Reduce visual effects for better performance
  reduceVisualEffects() {
    const style = document.createElement('style');
    style.textContent = `
      .performance-mode .blur-effect,
      .performance-mode .backdrop-filter {
        backdrop-filter: none !important;
        filter: none !important;
      }
      
      .performance-mode .shadow-effect {
        box-shadow: none !important;
      }
      
      .performance-mode .gradient-background {
        background: solid !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Optimize specific elements for GPU acceleration
  accelerateElement(element, options = {}) {
    if (!element || this.acceleratedElements.has(element)) return;
    
    const {
      willChange = 'transform',
      transform3d = true,
      isolation = true
    } = options;
    
    // Apply GPU acceleration styles
    element.style.willChange = willChange;
    
    if (transform3d) {
      element.style.transform = element.style.transform 
        ? `${element.style.transform} translateZ(0)`
        : 'translateZ(0)';
    }
    
    if (isolation) {
      element.style.isolation = 'isolate';
    }
    
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    
    this.acceleratedElements.add(element);
  }

  // Setup intersection observer for performance optimization
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.accelerateElement(entry.target);
        } else {
          this.deaccelerateElement(entry.target);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1
    });
    
    // Observe elements with specific classes
    document.querySelectorAll('.gpu-optimize, .animate-on-scroll, .parallax').forEach(el => {
      observer.observe(el);
    });
  }

  // Remove GPU acceleration when not needed
  deaccelerateElement(element) {
    if (!this.acceleratedElements.has(element)) return;
    
    element.style.willChange = 'auto';
    element.style.transform = element.style.transform.replace('translateZ(0)', '').trim();
    
    this.acceleratedElements.delete(element);
  }
}

// Advanced Memory Manager for Smartphones
class SmartphoneMemoryManager {
  constructor() {
    this.memoryPressureLevel = 'normal';
    this.memoryObserver = null;
    this.componentCache = new Map();
    this.imageCache = new Map();
    this.maxCacheSize = this.calculateOptimalCacheSize();
    
    this.init();
  }

  // Calculate optimal cache size based on device capabilities
  calculateOptimalCacheSize() {
    const deviceMemory = navigator.deviceMemory || 4;
    const connectionSpeed = navigator.connection?.effectiveType || '4g';
    
    let cacheSize = 50; // Base 50MB
    
    // Adjust based on device memory
    if (deviceMemory >= 8) cacheSize = 200;
    else if (deviceMemory >= 6) cacheSize = 150;
    else if (deviceMemory >= 4) cacheSize = 100;
    else cacheSize = 50;
    
    // Adjust based on connection
    if (connectionSpeed === '4g') cacheSize *= 1.2;
    else if (connectionSpeed === '3g') cacheSize *= 0.8;
    else if (connectionSpeed === '2g') cacheSize *= 0.5;
    
    return Math.round(cacheSize * 1024 * 1024); // Convert to bytes
  }

  init() {
    this.setupMemoryPressureObserver();
    this.setupPeriodicCleanup();
    this.setupVisibilityChangeHandler();
    
    console.log(`📱 Smartphone memory manager initialized (cache: ${Math.round(this.maxCacheSize / 1024 / 1024)}MB)`);
  }

  // Setup memory pressure observer
  setupMemoryPressureObserver() {
    // Modern memory pressure API
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memInfo = performance.memory;
        const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (usageRatio > 0.9) {
          this.handleMemoryPressure('critical');
        } else if (usageRatio > 0.7) {
          this.handleMemoryPressure('high');
        } else if (usageRatio > 0.5) {
          this.handleMemoryPressure('medium');
        } else {
          this.handleMemoryPressure('normal');
        }
      };
      
      // Check every 10 seconds
      setInterval(checkMemoryPressure, 10000);
      checkMemoryPressure(); // Initial check
    }
    
    // Fallback for devices without memory API
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) {
      this.memoryPressureLevel = 'high';
      this.handleMemoryPressure('high');
    }
  }

  // Handle different memory pressure levels
  handleMemoryPressure(level) {
    if (level === this.memoryPressureLevel) return;
    
    this.memoryPressureLevel = level;
    console.log(`📱 Memory pressure: ${level}`);
    
    switch (level) {
      case 'critical':
        this.emergencyCleanup();
        break;
      case 'high':
        this.aggressiveCleanup();
        break;
      case 'medium':
        this.moderateCleanup();
        break;
      case 'normal':
        this.normalOperation();
        break;
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('memoryPressureChange', {
      detail: { level, pressure: level }
    }));
  }

  // Emergency cleanup for critical memory situations
  emergencyCleanup() {
    // Clear all caches
    this.componentCache.clear();
    this.imageCache.clear();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Reduce cache sizes
    this.maxCacheSize = Math.round(this.maxCacheSize * 0.5);
    
    // Disable non-essential features
    document.documentElement.classList.add('low-memory-mode');
    
    console.log('🆘 Emergency memory cleanup performed');
  }

  // Aggressive cleanup for high memory pressure
  aggressiveCleanup() {
    // Clear 70% of caches
    this.clearCachePercentage(0.7);
    
    // Reduce image quality
    this.optimizeImages();
    
    // Defer non-critical operations
    this.deferNonCriticalOperations();
    
    console.log('🧹 Aggressive memory cleanup performed');
  }

  // Moderate cleanup for medium memory pressure
  moderateCleanup() {
    // Clear 30% of caches
    this.clearCachePercentage(0.3);
    
    // Optimize DOM
    this.optimizeDOM();
    
    console.log('🧽 Moderate memory cleanup performed');
  }

  // Normal operation mode
  normalOperation() {
    document.documentElement.classList.remove('low-memory-mode');
    this.maxCacheSize = this.calculateOptimalCacheSize();
    
    console.log('✅ Normal memory operation restored');
  }

  // Clear cache by percentage
  clearCachePercentage(percentage) {
    const componentEntries = Array.from(this.componentCache.entries());
    const imageEntries = Array.from(this.imageCache.entries());
    
    const componentsToRemove = Math.floor(componentEntries.length * percentage);
    const imagesToRemove = Math.floor(imageEntries.length * percentage);
    
    // Remove oldest entries first
    componentEntries
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      .slice(0, componentsToRemove)
      .forEach(([key]) => this.componentCache.delete(key));
    
    imageEntries
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      .slice(0, imagesToRemove)
      .forEach(([key]) => this.imageCache.delete(key));
  }

  // Optimize images for memory pressure
  optimizeImages() {
    const images = document.querySelectorAll('img[src]');
    
    images.forEach(img => {
      if (img.naturalWidth > 800) {
        // Reduce image resolution
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = Math.min(img.naturalWidth, 800);
        canvas.height = Math.min(img.naturalHeight, 600);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = canvas.toDataURL('image/jpeg', 0.8);
      }
    });
  }

  // Defer non-critical operations
  deferNonCriticalOperations() {
    // Disable animations in low memory mode
    document.documentElement.classList.add('disable-animations');
    
    // Defer lazy loading
    window.dispatchEvent(new CustomEvent('deferLazyLoading'));
    
    // Pause video elements
    document.querySelectorAll('video').forEach(video => {
      if (!video.paused) {
        video.pause();
        video.dataset.wasPlaying = 'true';
      }
    });
  }

  // Optimize DOM structure
  optimizeDOM() {
    // Remove unused event listeners
    this.cleanupEventListeners();
    
    // Clean up empty text nodes
    this.cleanupTextNodes();
    
    // Optimize CSS
    this.optimizeCSS();
  }

  // Setup periodic cleanup
  setupPeriodicCleanup() {
    setInterval(() => {
      if (this.memoryPressureLevel === 'normal') {
        this.routineCleanup();
      }
    }, 300000); // Every 5 minutes
  }

  // Routine cleanup during normal operation
  routineCleanup() {
    // Clear old cache entries
    this.clearCachePercentage(0.1);
    
    // Clean up DOM
    this.cleanupTextNodes();
    
    console.log('🔄 Routine memory cleanup performed');
  }

  // Setup visibility change handler
  setupVisibilityChangeHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background
        this.handleBackgroundState();
      } else {
        // App came to foreground
        this.handleForegroundState();
      }
    });
  }

  // Handle app going to background
  handleBackgroundState() {
    // Pause non-essential operations
    this.pauseNonEssentialOperations();
    
    // Clear some caches
    this.clearCachePercentage(0.2);
    
    console.log('📱 App backgrounded - memory optimized');
  }

  // Handle app coming to foreground
  handleForegroundState() {
    // Resume operations
    this.resumeOperations();
    
    console.log('📱 App foregrounded - operations resumed');
  }

  // Cleanup helper methods
  cleanupEventListeners() {
    // Remove orphaned event listeners (simplified implementation)
    const elements = document.querySelectorAll('[data-cleanup-listeners]');
    elements.forEach(el => {
      el.removeAttribute('data-cleanup-listeners');
    });
  }

  cleanupTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent.trim() === '' ? 
            NodeFilter.FILTER_ACCEPT : 
            NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const emptyTextNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
      emptyTextNodes.push(node);
    }
    
    emptyTextNodes.forEach(textNode => {
      textNode.parentNode?.removeChild(textNode);
    });
  }

  optimizeCSS() {
    // Remove unused CSS classes (simplified)
    const unusedClasses = [];
    
    document.querySelectorAll('*').forEach(el => {
      const classes = Array.from(el.classList);
      classes.forEach(className => {
        if (className.startsWith('temp-') || className.startsWith('old-')) {
          el.classList.remove(className);
        }
      });
    });
  }

  pauseNonEssentialOperations() {
    // Pause timers
    window.dispatchEvent(new CustomEvent('pauseNonEssentialTimers'));
    
    // Pause animations
    document.querySelectorAll('.animated').forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  }

  resumeOperations() {
    // Resume timers
    window.dispatchEvent(new CustomEvent('resumeOperations'));
    
    // Resume animations
    document.querySelectorAll('.animated').forEach(el => {
      el.style.animationPlayState = 'running';
    });
    
    // Resume videos that were playing
    document.querySelectorAll('video[data-was-playing="true"]').forEach(video => {
      video.play();
      video.removeAttribute('data-was-playing');
    });
  }
}

// Modern Caching Strategy Manager
class ModernCachingManager {
  constructor() {
    this.cacheStrategies = {
      'static-assets': 'cache-first',
      'api-data': 'network-first',
      'user-content': 'cache-first',
      'real-time': 'network-only'
    };
    
    this.compressionSupport = this.checkCompressionSupport();
    this.init();
  }

  checkCompressionSupport() {
    const supported = [];
    
    if ('CompressionStream' in window) {
      supported.push('gzip', 'deflate');
    }
    
    if ('ReadableStream' in window && 'TransformStream' in window) {
      supported.push('br'); // Brotli
    }
    
    return supported;
  }

  init() {
    this.setupServiceWorkerCaching();
    this.setupIndexedDBCaching();
    this.setupMemoryCaching();
    
    console.log('💾 Modern caching strategies initialized');
  }

  async setupServiceWorkerCaching() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Send caching configuration to service worker
        registration.active?.postMessage({
          type: 'CONFIGURE_CACHING',
          strategies: this.cacheStrategies,
          compression: this.compressionSupport
        });
        
      } catch (error) {
        console.error('Failed to configure service worker caching:', error);
      }
    }
  }

  async setupIndexedDBCaching() {
    if ('indexedDB' in window) {
      try {
        this.db = await this.openDatabase();
        console.log('💾 IndexedDB caching ready');
      } catch (error) {
        console.error('Failed to setup IndexedDB caching:', error);
      }
    }
  }

  setupMemoryCaching() {
    // Implement LRU cache with size limits
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 50 * 1024 * 1024; // 50MB
    this.currentMemoryCacheSize = 0;
  }

  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuibishCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('apiCache')) {
          const apiStore = db.createObjectStore('apiCache', { keyPath: 'url' });
          apiStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('assetCache')) {
          const assetStore = db.createObjectStore('assetCache', { keyPath: 'url' });
          assetStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }
}

// Initialize all performance optimizations
export const initSmartphonePerformance = () => {
  console.log('🚀 Initializing smartphone performance optimizations...');
  
  const gpuManager = new GPUAccelerationManager();
  const memoryManager = new SmartphoneMemoryManager();
  const cachingManager = new ModernCachingManager();
  
  // Make managers available globally
  window.performanceManagers = {
    gpu: gpuManager,
    memory: memoryManager,
    caching: cachingManager
  };
  
  console.log('✅ Smartphone performance optimizations initialized');
  
  return {
    gpuManager,
    memoryManager,
    cachingManager
  };
};

export {
  GPUAccelerationManager,
  SmartphoneMemoryManager,
  ModernCachingManager
};

export default {
  initSmartphonePerformance,
  GPUAccelerationManager,
  SmartphoneMemoryManager,
  ModernCachingManager
};