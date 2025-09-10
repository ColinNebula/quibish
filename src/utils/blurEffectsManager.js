/**
 * Advanced Blur Effects Utility
 * Dynamic blur intensity based on content and performance
 */

class BlurEffectsManager {
  constructor() {
    this.performanceLevel = this.detectPerformanceLevel();
    this.observers = new Map();
    this.blurCache = new Map();
    this.init();
  }

  init() {
    this.setupPerformanceMonitoring();
    this.setupIntersectionObserver();
    this.setupMutationObserver();
    this.applyInitialBlurSettings();
  }

  // Detect device performance level
  detectPerformanceLevel() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'low';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // Check for high-end GPUs
    if (renderer.includes('RTX') || renderer.includes('RX 6') || renderer.includes('M1') || renderer.includes('M2')) {
      return 'ultra';
    }
    
    // Check for mid-range GPUs
    if (renderer.includes('GTX') || renderer.includes('RX 5') || renderer.includes('Intel Iris')) {
      return 'high';
    }
    
    // Check memory and cores
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    if (memory >= 8 && cores >= 8) return 'high';
    if (memory >= 4 && cores >= 4) return 'medium';
    
    return 'low';
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const avgFrameTime = entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;
        
        // Adjust blur quality based on performance
        if (avgFrameTime > 16.67) { // Below 60fps
          this.reduceBlurQuality();
        } else if (avgFrameTime < 8.33) { // Above 120fps
          this.increaseBlurQuality();
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    }
  }

  // Setup intersection observer for dynamic blur
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        if (entry.isIntersecting) {
          this.activateBlur(element);
        } else {
          this.deactivateBlur(element);
        }
      });
    }, { threshold: 0.1 });

    // Observe all glass elements
    document.querySelectorAll('[class*="glass-"], [class*="card-"]').forEach((el) => {
      observer.observe(el);
    });

    this.intersectionObserver = observer;
  }

  // Setup mutation observer for new elements
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const glassElements = node.querySelectorAll('[class*="glass-"], [class*="card-"]');
            glassElements.forEach((el) => {
              this.intersectionObserver.observe(el);
              this.applyDynamicBlur(el);
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Apply initial blur settings based on performance
  applyInitialBlurSettings() {
    const root = document.documentElement;
    
    switch (this.performanceLevel) {
      case 'ultra':
        root.style.setProperty('--performance-blur-multiplier', '1.5');
        root.style.setProperty('--performance-shadow-quality', 'high');
        break;
      case 'high':
        root.style.setProperty('--performance-blur-multiplier', '1.2');
        root.style.setProperty('--performance-shadow-quality', 'medium');
        break;
      case 'medium':
        root.style.setProperty('--performance-blur-multiplier', '1.0');
        root.style.setProperty('--performance-shadow-quality', 'medium');
        break;
      case 'low':
        root.style.setProperty('--performance-blur-multiplier', '0.7');
        root.style.setProperty('--performance-shadow-quality', 'low');
        break;
    }
  }

  // Activate blur for visible elements
  activateBlur(element) {
    if (this.blurCache.has(element)) return;
    
    const computedStyle = getComputedStyle(element);
    const originalBlur = computedStyle.backdropFilter || computedStyle.webkitBackdropFilter;
    
    this.blurCache.set(element, originalBlur);
    this.applyDynamicBlur(element);
  }

  // Deactivate blur for invisible elements (performance optimization)
  deactivateBlur(element) {
    if (this.performanceLevel === 'low') {
      element.style.backdropFilter = 'none';
      element.style.webkitBackdropFilter = 'none';
    }
  }

  // Apply dynamic blur based on content behind element
  applyDynamicBlur(element) {
    const rect = element.getBoundingClientRect();
    const backgroundComplexity = this.analyzeBackgroundComplexity(rect);
    const blurIntensity = this.calculateOptimalBlur(backgroundComplexity);
    
    element.style.backdropFilter = `blur(${blurIntensity}px)`;
    element.style.webkitBackdropFilter = `blur(${blurIntensity}px)`;
  }

  // Analyze background complexity to adjust blur
  analyzeBackgroundComplexity(rect) {
    // Create a temporary canvas to sample background
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.min(rect.width, 100);
    canvas.height = Math.min(rect.height, 100);
    
    try {
      // Sample background content (simplified complexity detection)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let complexity = 0;
      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate color variance as complexity metric
        const variance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
        complexity += variance;
      }
      
      return Math.min(complexity / (data.length / 4), 255);
    } catch (e) {
      return 128; // Default medium complexity
    }
  }

  // Calculate optimal blur based on complexity and performance
  calculateOptimalBlur(complexity) {
    const baseBlur = 12; // Base blur amount
    const complexityFactor = complexity / 255; // 0-1 scale
    const performanceMultiplier = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--performance-blur-multiplier') || '1'
    );
    
    // More complex backgrounds need more blur for readability
    const dynamicBlur = baseBlur + (complexityFactor * 16);
    
    return Math.round(dynamicBlur * performanceMultiplier);
  }

  // Reduce blur quality for performance
  reduceBlurQuality() {
    if (this.performanceLevel === 'low') return;
    
    const currentMultiplier = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--performance-blur-multiplier') || '1'
    );
    
    const newMultiplier = Math.max(currentMultiplier * 0.9, 0.5);
    document.documentElement.style.setProperty('--performance-blur-multiplier', newMultiplier);
  }

  // Increase blur quality when performance allows
  increaseBlurQuality() {
    const currentMultiplier = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--performance-blur-multiplier') || '1'
    );
    
    const maxMultiplier = this.performanceLevel === 'ultra' ? 2.0 : 1.5;
    const newMultiplier = Math.min(currentMultiplier * 1.1, maxMultiplier);
    document.documentElement.style.setProperty('--performance-blur-multiplier', newMultiplier);
  }

  // Apply blur effect to specific element
  applyBlurEffect(element, intensity = 'medium', options = {}) {
    const {
      animated = true,
      adaptive = true,
      shadow = true
    } = options;

    const blurValues = {
      subtle: 8,
      medium: 12,
      strong: 20,
      intense: 32,
      extreme: 48
    };

    let blurAmount = blurValues[intensity] || blurValues.medium;
    
    if (adaptive) {
      const rect = element.getBoundingClientRect();
      const complexity = this.analyzeBackgroundComplexity(rect);
      blurAmount = this.calculateOptimalBlur(complexity);
    }

    const performanceMultiplier = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--performance-blur-multiplier') || '1'
    );

    blurAmount *= performanceMultiplier;

    if (animated) {
      element.style.transition = 'backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease';
    }

    element.style.backdropFilter = `blur(${blurAmount}px)`;
    element.style.webkitBackdropFilter = `blur(${blurAmount}px)`;

    if (shadow) {
      element.style.boxShadow = `0 ${blurAmount / 2}px ${blurAmount * 2}px rgba(0, 0, 0, 0.1)`;
    }
  }

  // Create smart glass surface that adapts to content
  createSmartGlass(element, options = {}) {
    const {
      intensity = 'medium',
      adaptive = true,
      responsive = true,
      animated = true
    } = options;

    element.classList.add('smart-glass');
    
    if (adaptive) {
      this.intersectionObserver.observe(element);
    }

    this.applyBlurEffect(element, intensity, options);

    if (responsive) {
      const resizeObserver = new ResizeObserver(() => {
        this.applyDynamicBlur(element);
      });
      resizeObserver.observe(element);
    }

    return element;
  }

  // Get current performance metrics
  getPerformanceMetrics() {
    return {
      level: this.performanceLevel,
      multiplier: parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--performance-blur-multiplier') || '1'
      ),
      activeBlurs: this.blurCache.size
    };
  }
}

// Initialize the blur effects manager
const blurManager = new BlurEffectsManager();

// Export for global use
window.BlurEffectsManager = blurManager;

export default blurManager;