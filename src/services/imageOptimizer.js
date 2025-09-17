class ImageOptimizer {
  constructor() {
    this.supportsWebP = null;
    this.supportsAvif = null;
    this.checkFormatSupport();
  }

  async checkFormatSupport() {
    // Check WebP support
    this.supportsWebP = await this.canUseWebP();
    
    // Check AVIF support (newer, better compression)
    this.supportsAvif = await this.canUseAvif();
    
    console.log(`📸 Image format support: WebP=${this.supportsWebP}, AVIF=${this.supportsAvif}`);
  }

  canUseWebP() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  canUseAvif() {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=';
    });
  }

  // Generate optimized image URL based on device and format support
  getOptimizedImageUrl(originalUrl, options = {}) {
    const {
      width = null,
      height = null,
      quality = 80,
      fit = 'cover',
      format = 'auto'
    } = options;

    // If it's already a data URL or blob, return as-is
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      return originalUrl;
    }

    // For external URLs that support query parameters (like UI Avatars)
    if (originalUrl.includes('ui-avatars.com')) {
      const url = new URL(originalUrl);
      
      // Optimize UI Avatars specifically
      if (width) url.searchParams.set('size', width.toString());
      if (format !== 'auto') url.searchParams.set('format', format);
      
      // Add retina support for high DPI displays
      const pixelRatio = window.devicePixelRatio || 1;
      if (pixelRatio > 1 && width) {
        url.searchParams.set('size', Math.round(width * pixelRatio).toString());
      }
      
      return url.toString();
    }

    // For local images, add responsive parameters
    if (originalUrl.startsWith('/') || originalUrl.includes(window.location.origin)) {
      const params = new URLSearchParams();
      
      if (width) params.set('w', width);
      if (height) params.set('h', height);
      if (quality !== 80) params.set('q', quality);
      if (fit !== 'cover') params.set('fit', fit);
      
      // Auto-select best format
      if (format === 'auto') {
        if (this.supportsAvif) params.set('f', 'avif');
        else if (this.supportsWebP) params.set('f', 'webp');
      } else if (format) {
        params.set('f', format);
      }
      
      const separator = originalUrl.includes('?') ? '&' : '?';
      return params.toString() ? `${originalUrl}${separator}${params.toString()}` : originalUrl;
    }

    // Return original URL if no optimization possible
    return originalUrl;
  }

  // Create responsive image srcSet for different screen sizes
  createResponsiveSrcSet(baseUrl, sizes = [320, 480, 768, 1024, 1440]) {
    const srcSet = sizes.map(size => {
      const optimizedUrl = this.getOptimizedImageUrl(baseUrl, { width: size });
      return `${optimizedUrl} ${size}w`;
    }).join(', ');

    return srcSet;
  }

  // Get optimal image dimensions based on device
  getOptimalDimensions(originalWidth, originalHeight, maxWidth = null, maxHeight = null) {
    const pixelRatio = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default max dimensions based on viewport
    const defaultMaxWidth = maxWidth || Math.min(viewportWidth * pixelRatio, 1920);
    const defaultMaxHeight = maxHeight || Math.min(viewportHeight * pixelRatio, 1080);

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;

    let optimalWidth = Math.min(originalWidth, defaultMaxWidth);
    let optimalHeight = Math.min(originalHeight, defaultMaxHeight);

    // Maintain aspect ratio
    if (optimalWidth / aspectRatio > optimalHeight) {
      optimalWidth = optimalHeight * aspectRatio;
    } else {
      optimalHeight = optimalWidth / aspectRatio;
    }

    return {
      width: Math.round(optimalWidth),
      height: Math.round(optimalHeight),
      pixelRatio
    };
  }

  // Compress image on client side (for uploads)
  async compressImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/jpeg'
    } = options;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions
        const optimal = this.getOptimalDimensions(img.width, img.height, maxWidth, maxHeight);
        
        canvas.width = optimal.width;
        canvas.height = optimal.height;

        // Enable better image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and compress
        ctx.drawImage(img, 0, 0, optimal.width, optimal.height);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, format, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Lazy load images with intersection observer
  setupLazyLoading(selector = 'img[data-lazy]') {
    if (!('IntersectionObserver' in window)) {
      // Fallback for older browsers
      document.querySelectorAll(selector).forEach(img => {
        this.loadImage(img);
      });
      return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      // Load images when they're 100px away from viewport
      rootMargin: '100px'
    });

    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });
  }

  loadImage(img) {
    const dataSrc = img.getAttribute('data-lazy');
    if (dataSrc) {
      // Get optimized URL
      const optimizedSrc = this.getOptimizedImageUrl(dataSrc, {
        width: img.width || img.clientWidth,
        height: img.height || img.clientHeight
      });

      img.src = optimizedSrc;
      img.removeAttribute('data-lazy');
      img.classList.add('loaded');
    }
  }

  // Preload critical images
  preloadCriticalImages(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = this.getOptimizedImageUrl(url);
      document.head.appendChild(link);
    });
  }

  // Get image loading performance metrics
  getImageMetrics() {
    const images = Array.from(document.images);
    const metrics = {
      total: images.length,
      loaded: 0,
      failed: 0,
      totalSize: 0,
      avgLoadTime: 0
    };

    images.forEach(img => {
      if (img.complete) {
        if (img.naturalWidth > 0) {
          metrics.loaded++;
        } else {
          metrics.failed++;
        }
      }
    });

    return metrics;
  }

  // Mobile-specific optimizations
  getMobileOptimizations() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSlowConnection = navigator.connection?.effectiveType === 'slow-2g' || 
                            navigator.connection?.effectiveType === '2g';

    return {
      isMobile,
      isSlowConnection,
      // Reduce quality for mobile/slow connections
      quality: isSlowConnection ? 60 : isMobile ? 70 : 80,
      // Smaller max dimensions for mobile
      maxWidth: isMobile ? 1080 : 1920,
      maxHeight: isMobile ? 1080 : 1080,
      // Prefer WebP for better compression
      preferWebP: true
    };
  }
}

// Create singleton instance
const imageOptimizer = new ImageOptimizer();

export default imageOptimizer;