// Advanced Performance Optimizer for QuiBish
class PerformanceOptimizer {
  constructor() {
    this.performanceObserver = null;
    this.metrics = new Map();
    this.thresholds = {
      FCP: 1500,  // First Contentful Paint
      LCP: 2500,  // Largest Contentful Paint
      FID: 100,   // First Input Delay
      CLS: 0.1    // Cumulative Layout Shift
    };
    this.init();
  }

  init() {
    this.setupPerformanceObserver();
    this.optimizeImages();
    this.preloadCriticalResources();
    this.setupLazyLoading();
    this.optimizeEventListeners();
  }

  // Monitor Core Web Vitals
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime);
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.recordMetric('FID', entry.processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.recordMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  recordMetric(name, value) {
    this.metrics.set(name, value);
    this.evaluatePerformance(name, value);
  }

  evaluatePerformance(name, value) {
    const threshold = this.thresholds[name];
    const status = value <= threshold ? 'good' : value <= threshold * 2 ? 'needs-improvement' : 'poor';
    
    console.log(`📊 ${name}: ${value.toFixed(2)}ms - ${status}`);
    
    if (status === 'poor') {
      this.applyOptimizations(name);
    }
  }

  applyOptimizations(metric) {
    switch (metric) {
      case 'FCP':
        this.optimizeCriticalRendering();
        break;
      case 'LCP':
        this.optimizeLargestContentful();
        break;
      case 'FID':
        this.optimizeInteractivity();
        break;
      case 'CLS':
        this.reduceLayoutShift();
        break;
    }
  }

  // Optimize critical rendering path
  optimizeCriticalRendering() {
    // Preload critical fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = '/fonts/critical-font.woff2';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);

    // Inline critical CSS
    const criticalCSS = `
      .app-shell { display: block; visibility: visible; }
      .loading-spinner { animation-duration: 0.5s; }
    `;
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);
  }

  // Optimize images with modern formats
  optimizeImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            
            // Use WebP if supported
            if (this.supportsWebP()) {
              img.src = img.dataset.src?.replace(/\.(jpg|jpeg|png)$/, '.webp') || img.dataset.src;
            } else {
              img.src = img.dataset.src;
            }
            
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      // Wait for DOM to be ready and validate elements exist
      const initializeLazyLoading = () => {
        const lazyImages = document.querySelectorAll('img[data-src]');
        if (lazyImages.length > 0) {
          lazyImages.forEach(img => {
            if (img && typeof img.getAttribute === 'function') {
              imageObserver.observe(img);
            }
          });
        }
      };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeLazyLoading);
      } else {
        initializeLazyLoading();
      }
    }
  }

  supportsWebP() {
    if (this.webpSupport !== undefined) return this.webpSupport;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL('image/webp');
    this.webpSupport = dataUrl && typeof dataUrl.indexOf === 'function' 
      ? dataUrl.indexOf('data:image/webp') === 0 
      : false;
    return this.webpSupport;
  }

  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      { href: '/api/startup', as: 'fetch' },
      { href: '/api/users/profile', as: 'fetch' },
      { href: '/default-avatar.png', as: 'image' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.as === 'fetch') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }

  // Setup intersection observer for lazy loading
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            element.classList.add('loaded');
            lazyObserver.unobserve(element);
          }
        });
      }, {
        rootMargin: '50px'
      });

      document.querySelectorAll('.lazy-load').forEach(element => {
        lazyObserver.observe(element);
      });
    }
  }

  // Optimize event listeners with passive and debouncing
  optimizeEventListeners() {
    // Use passive listeners for touch events
    const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'scroll'];
    passiveEvents.forEach(event => {
      document.addEventListener(event, () => {}, { passive: true });
    });

    // Debounce resize events
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        window.dispatchEvent(new Event('optimized-resize'));
      }, 150);
    });
  }

  optimizeLargestContentful() {
    // Optimize largest element rendering
    const largestElements = document.querySelectorAll('img, video, canvas, svg');
    largestElements.forEach(element => {
      if (element.tagName === 'IMG') {
        element.loading = 'eager';
        element.fetchPriority = 'high';
      }
    });
  }

  optimizeInteractivity() {
    // Break up long tasks
    const tasks = [];
    
    const scheduler = (callback) => {
      if ('scheduler' in window && 'postTask' in window.scheduler) {
        window.scheduler.postTask(callback, { priority: 'user-blocking' });
      } else {
        setTimeout(callback, 0);
      }
    };

    // Process tasks in small chunks
    const processTasks = () => {
      const start = performance.now();
      while (tasks.length > 0 && performance.now() - start < 5) {
        const task = tasks.shift();
        task();
      }
      if (tasks.length > 0) {
        scheduler(processTasks);
      }
    };

    window.scheduleTask = (task) => {
      tasks.push(task);
      if (tasks.length === 1) {
        scheduler(processTasks);
      }
    };
  }

  reduceLayoutShift() {
    // Set dimensions on images and containers
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      img.style.aspectRatio = '16/9'; // Default aspect ratio
    });

    // Reserve space for dynamic content
    const dynamicContainers = document.querySelectorAll('.dynamic-content');
    dynamicContainers.forEach(container => {
      if (!container.style.minHeight) {
        container.style.minHeight = '200px';
      }
    });
  }

  // Get performance metrics
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Generate performance report
  generateReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      scores: {}
    };

    Object.entries(metrics).forEach(([name, value]) => {
      const threshold = this.thresholds[name];
      report.scores[name] = value <= threshold ? 'good' : 
                           value <= threshold * 2 ? 'needs-improvement' : 'poor';
    });

    return report;
  }
}

// Memory management utilities
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.cleanupInterval = 300000; // 5 minutes
    this.startCleanup();
  }

  set(key, value, ttl = 600000) { // 10 minutes default TTL
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      lastAccessed: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    item.lastAccessed = Date.now();
    return item.value;
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires || now - item.lastAccessed > 1800000) { // 30 minutes unused
          this.cache.delete(key);
        }
      }
    }, this.cleanupInterval);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
}

// Export instances
const performanceOptimizer = new PerformanceOptimizer();
const memoryManager = new MemoryManager();

export { PerformanceOptimizer, performanceOptimizer, memoryManager };
export default performanceOptimizer;