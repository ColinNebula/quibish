/**
 * Image Optimization Service for Mobile Performance
 * Handles WebP/AVIF conversion, compression, and lazy loading
 */

class ImageOptimizationService {
  constructor() {
    this.supportedFormats = this.detectFormatSupport();
    this.compressionQuality = 0.8;
    this.maxImageSize = 1920; // Max width/height
    this.placeholderDataURL = this.generatePlaceholder();
    this.observer = null;
    this.loadedImages = new Set();
    
    this.init();
  }

  /**
   * Initialize the service
   */
  init() {
    this.setupIntersectionObserver();
    this.optimizeExistingImages();
    console.log('📸 Image Optimization Service initialized');
  }

  /**
   * Detect browser support for modern image formats
   */
  detectFormatSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    return {
      webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
      avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
      heic: 'HTMLImageElement' in window && 'decode' in HTMLImageElement.prototype
    };
  }

  /**
   * Generate optimized placeholder
   */
  generatePlaceholder(width = 400, height = 300, color = '#f3f4f6') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#e5e7eb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add loading indicator
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', width / 2, height / 2);
    
    return canvas.toDataURL('image/jpeg', 0.3);
  }

  /**
   * Setup intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without intersection observer
      this.loadAllImages();
      return;
    }

    const options = {
      root: null,
      rootMargin: '50px', // Load images 50px before they come into view
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, options);
  }

  /**
   * Optimize existing images on the page
   */
  optimizeExistingImages() {
    const images = document.querySelectorAll('img[data-src], img[src]');
    images.forEach(img => this.processImage(img));
  }

  /**
   * Process a single image element
   */
  processImage(img) {
    // Skip if already processed
    if (img.dataset.optimized === 'true') return;

    // Setup lazy loading
    if (img.dataset.src && !img.src) {
      img.src = this.placeholderDataURL;
      this.observer?.observe(img);
    } else if (img.src && !this.loadedImages.has(img.src)) {
      this.optimizeImageSrc(img);
    }

    // Add loading states
    this.addLoadingStates(img);
    
    img.dataset.optimized = 'true';
  }

  /**
   * Load image with optimization
   */
  async loadImage(img) {
    if (!img.dataset.src) return;

    try {
      const optimizedSrc = await this.getOptimizedImageUrl(img.dataset.src);
      
      // Preload the image
      const tempImage = new Image();
      tempImage.onload = () => {
        img.src = optimizedSrc;
        img.classList.add('loaded');
        img.classList.remove('loading');
        this.loadedImages.add(optimizedSrc);
      };
      
      tempImage.onerror = () => {
        // Fallback to original image
        img.src = img.dataset.src;
        img.classList.add('error');
        img.classList.remove('loading');
      };
      
      // Start loading
      img.classList.add('loading');
      tempImage.src = optimizedSrc;
      
    } catch (error) {
      console.error('Failed to load optimized image:', error);
      img.src = img.dataset.src; // Fallback
      img.classList.add('error');
      img.classList.remove('loading');
    }
  }

  /**
   * Get optimized image URL
   */
  async getOptimizedImageUrl(originalUrl) {
    // If it's a data URL or already optimized, return as-is
    if (originalUrl.startsWith('data:') || originalUrl.includes('optimized=true')) {
      return originalUrl;
    }

    // Check if we have a cached optimized version
    const cacheKey = `optimized_${originalUrl}`;
    const cached = await this.getCachedImage(cacheKey);
    if (cached) return cached;

    // Generate optimized URL
    const optimizedUrl = this.buildOptimizedUrl(originalUrl);
    
    // Cache the result
    this.cacheImage(cacheKey, optimizedUrl);
    
    return optimizedUrl;
  }

  /**
   * Build optimized image URL with format and quality parameters
   */
  buildOptimizedUrl(originalUrl) {
    const url = new URL(originalUrl, window.location.origin);
    
    // Add optimization parameters
    if (this.supportedFormats.avif) {
      url.searchParams.set('format', 'avif');
    } else if (this.supportedFormats.webp) {
      url.searchParams.set('format', 'webp');
    }
    
    url.searchParams.set('quality', Math.round(this.compressionQuality * 100));
    url.searchParams.set('maxSize', this.maxImageSize);
    url.searchParams.set('optimized', 'true');
    
    // Add responsive sizing based on device
    const devicePixelRatio = window.devicePixelRatio || 1;
    const maxWidth = Math.min(window.innerWidth * devicePixelRatio, this.maxImageSize);
    url.searchParams.set('w', Math.round(maxWidth));
    
    return url.toString();
  }

  /**
   * Optimize existing image sources
   */
  async optimizeImageSrc(img) {
    if (img.src.includes('optimized=true')) return;
    
    const optimizedSrc = await this.getOptimizedImageUrl(img.src);
    if (optimizedSrc !== img.src) {
      img.dataset.originalSrc = img.src;
      img.src = optimizedSrc;
    }
  }

  /**
   * Add loading states and CSS classes
   */
  addLoadingStates(img) {
    // Add CSS classes for styling
    img.classList.add('optimized-image');
    
    // Add loading event listeners
    img.addEventListener('load', () => {
      img.classList.add('loaded');
      img.classList.remove('loading', 'error');
    });
    
    img.addEventListener('error', () => {
      img.classList.add('error');
      img.classList.remove('loading', 'loaded');
      
      // Try fallback to original source
      if (img.dataset.originalSrc && img.src !== img.dataset.originalSrc) {
        img.src = img.dataset.originalSrc;
      }
    });
  }

  /**
   * Cache optimized image URLs
   */
  async cacheImage(key, url) {
    try {
      if ('caches' in window) {
        const cache = await caches.open('quibish-images-v2.0.0');
        const response = new Response(url);
        await cache.put(key, response);
      } else {
        // Fallback to localStorage
        localStorage.setItem(key, url);
      }
    } catch (error) {
      console.warn('Failed to cache image URL:', error);
    }
  }

  /**
   * Get cached image URL
   */
  async getCachedImage(key) {
    try {
      if ('caches' in window) {
        const cache = await caches.open('quibish-images-v2.0.0');
        const response = await cache.match(key);
        return response ? await response.text() : null;
      } else {
        // Fallback to localStorage
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('Failed to get cached image:', error);
      return null;
    }
  }

  /**
   * Compress image file (for uploads)
   */
  async compressImage(file, options = {}) {
    const {
      quality = this.compressionQuality,
      maxWidth = this.maxImageSize,
      maxHeight = this.maxImageSize,
      format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = this.calculateDimensions(
          img.width, img.height, maxWidth, maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            // Create new file with compressed data
            const compressedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, `image/${format}`, quality);
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      
      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => img.src = e.target.result;
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    if (aspectRatio > 1) {
      // Landscape
      const width = Math.min(originalWidth, maxWidth);
      const height = width / aspectRatio;
      return { width, height };
    } else {
      // Portrait or square
      const height = Math.min(originalHeight, maxHeight);
      const width = height * aspectRatio;
      return { width, height };
    }
  }

  /**
   * Load all images immediately (fallback)
   */
  loadAllImages() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      if (img.dataset.src) {
        this.loadImage(img);
      }
    });
  }

  /**
   * Create responsive image element
   */
  createResponsiveImage(src, alt = '', options = {}) {
    const {
      sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      loading = 'lazy',
      className = '',
      placeholder = true
    } = options;

    const img = document.createElement('img');
    
    if (loading === 'lazy') {
      img.dataset.src = src;
      if (placeholder) {
        img.src = this.placeholderDataURL;
      }
    } else {
      img.src = src;
    }
    
    img.alt = alt;
    img.sizes = sizes;
    img.loading = loading;
    img.className = `optimized-image ${className}`.trim();
    
    // Generate srcset for different sizes
    const srcset = this.generateSrcSet(src);
    if (srcset) {
      img.srcset = srcset;
    }
    
    this.processImage(img);
    
    return img;
  }

  /**
   * Generate srcset for responsive images
   */
  generateSrcSet(src) {
    const sizes = [320, 640, 768, 1024, 1200, 1920];
    const srcsetEntries = [];
    
    sizes.forEach(size => {
      if (size <= this.maxImageSize) {
        const url = new URL(src, window.location.origin);
        url.searchParams.set('w', size);
        url.searchParams.set('optimized', 'true');
        srcsetEntries.push(`${url.toString()} ${size}w`);
      }
    });
    
    return srcsetEntries.length > 1 ? srcsetEntries.join(', ') : null;
  }

  /**
   * Monitor and report performance
   */
  getPerformanceMetrics() {
    return {
      supportedFormats: this.supportedFormats,
      loadedImages: this.loadedImages.size,
      placeholderSize: Math.round(this.placeholderDataURL.length / 1024),
      compressionQuality: this.compressionQuality
    };
  }

  /**
   * Preload critical images
   */
  preloadImages(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.loadedImages.clear();
  }
}

// CSS for optimized images
const imageOptimizationCSS = `
/* Optimized Image Styles */
.optimized-image {
  transition: opacity 0.3s ease, transform 0.3s ease;
  max-width: 100%;
  height: auto;
}

.optimized-image.loading {
  opacity: 0.7;
  filter: blur(2px);
}

.optimized-image.loaded {
  opacity: 1;
  filter: none;
}

.optimized-image.error {
  opacity: 0.5;
  filter: grayscale(100%);
}

/* Placeholder animation */
.optimized-image:not(.loaded):not(.error) {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Responsive behavior */
@media (max-width: 768px) {
  .optimized-image {
    max-width: 100%;
    height: auto;
  }
}

/* Print optimization */
@media print {
  .optimized-image {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .optimized-image.loading {
    filter: contrast(1.5);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .optimized-image {
    transition: none;
  }
  
  .optimized-image:not(.loaded):not(.error) {
    animation: none;
    background: #f3f4f6;
  }
}
`;

// Inject CSS
function injectImageOptimizationStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = imageOptimizationCSS;
  document.head.appendChild(styleElement);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectImageOptimizationStyles();
    window.imageOptimizer = new ImageOptimizationService();
  });
} else {
  injectImageOptimizationStyles();
  window.imageOptimizer = new ImageOptimizationService();
}

export default ImageOptimizationService;