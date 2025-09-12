/**
 * Lazy Loading Service for Mobile Performance
 * Handles component lazy loading, code splitting, and resource optimization
 */

import React, { lazy, Suspense } from 'react';

class LazyLoadingService {
  constructor() {
    this.loadedComponents = new Map();
    this.loadingPromises = new Map();
    this.intersectionObserver = null;
    this.componentCache = new Map();
    this.preloadQueue = [];
    
    this.init();
  }

  /**
   * Initialize the lazy loading service
   */
  init() {
    this.setupComponentObserver();
    this.preloadCriticalComponents();
    console.log('⚡ Lazy Loading Service initialized');
  }

  /**
   * Setup intersection observer for component lazy loading
   */
  setupComponentObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, falling back to immediate loading');
      return;
    }

    const options = {
      root: null,
      rootMargin: '100px', // Load components 100px before they come into view
      threshold: 0.1
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const componentName = entry.target.dataset.lazyComponent;
          if (componentName) {
            this.loadComponent(componentName);
            this.intersectionObserver.unobserve(entry.target);
          }
        }
      });
    }, options);
  }

  /**
   * Create lazy component with error boundary and loading state
   */
  createLazyComponent(componentName, importFunction, options = {}) {
    const {
      fallback = this.createLoadingComponent(componentName),
      errorFallback = this.createErrorComponent(componentName),
      preload = false,
      retryable = true
    } = options;

    // Cache the component if not already cached
    if (!this.componentCache.has(componentName)) {
      const LazyComponent = lazy(() => this.withRetry(importFunction, retryable));
      this.componentCache.set(componentName, LazyComponent);
    }

    const LazyComponent = this.componentCache.get(componentName);

    // Create wrapper component with error boundary
    const LazyWrapper = (props) => (
      <Suspense fallback={fallback}>
        <ErrorBoundary fallback={errorFallback} componentName={componentName}>
          <LazyComponent {...props} />
        </ErrorBoundary>
      </Suspense>
    );

    // Preload if requested
    if (preload) {
      this.preloadComponent(componentName, importFunction);
    }

    return LazyWrapper;
  }

  /**
   * Import function with retry logic
   */
  withRetry(importFunction, retryable = true, maxRetries = 3) {
    return async () => {
      let lastError;
      
      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await importFunction();
        } catch (error) {
          lastError = error;
          
          if (!retryable || i === maxRetries) {
            throw error;
          }
          
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          console.warn(`Component load failed, retrying (${i + 1}/${maxRetries + 1})...`);
        }
      }
      
      throw lastError;
    };
  }

  /**
   * Preload component without rendering
   */
  async preloadComponent(componentName, importFunction) {
    if (this.loadedComponents.has(componentName)) {
      return this.loadedComponents.get(componentName);
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const loadPromise = this.withRetry(importFunction)()
      .then(module => {
        this.loadedComponents.set(componentName, module);
        this.loadingPromises.delete(componentName);
        return module;
      })
      .catch(error => {
        this.loadingPromises.delete(componentName);
        console.error(`Failed to preload component ${componentName}:`, error);
        throw error;
      });

    this.loadingPromises.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Load component immediately
   */
  async loadComponent(componentName) {
    const importFunction = this.getComponentImportFunction(componentName);
    if (importFunction) {
      return this.preloadComponent(componentName, importFunction);
    }
  }

  /**
   * Get import function for component
   */
  getComponentImportFunction(componentName) {
    const componentMap = {
      // Chat components
      'VideoCall': () => import('../components/Home/VideoCall'),
      'MessageActions': () => import('../components/Home/MessageActions'),
      'GifPicker': () => import('../components/GifPicker/GifPicker'),
      
      // Modals
      'UserProfileModal': () => import('../components/UserProfile/UserProfileModal'),
      'EditProfileModal': () => import('../components/UserProfile/EditProfileModal'),
      'SettingsModal': () => import('../components/Home/SettingsModal'),
      'FeedbackModal': () => import('../components/Home/FeedbackModal'),
      'HelpModal': () => import('../components/Home/HelpModal'),
      'NewChatModal': () => import('../components/NewChat/NewChatModal'),
      
      // Native features
      'NativeCamera': () => import('../components/NativeFeatures/NativeCamera'),
      'NativeContactPicker': () => import('../components/NativeFeatures/NativeContactPicker'),
      
      // PWA components
      'InstallPrompt': () => import('../components/PWA/InstallPrompt'),
      
      // Enhanced media features
      'EnhancedMediaViewer': () => import('../components/Media/EnhancedMediaViewer')
    };

    return componentMap[componentName];
  }

  /**
   * Preload critical components
   */
  preloadCriticalComponents() {
    const criticalComponents = [
      'MessageActions',
      'UserProfileModal',
      'SettingsModal'
    ];

    // Preload critical components after a short delay
    setTimeout(() => {
      criticalComponents.forEach(componentName => {
        const importFunction = this.getComponentImportFunction(componentName);
        if (importFunction) {
          this.preloadComponent(componentName, importFunction);
        }
      });
    }, 2000);
  }

  /**
   * Create loading component
   */
  createLoadingComponent(componentName) {
    return (
      <div className="lazy-loading-container">
        <div className="lazy-loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="lazy-loading-text">
          Loading {componentName.replace(/([A-Z])/g, ' $1').trim()}...
        </div>
      </div>
    );
  }

  /**
   * Create error component
   */
  createErrorComponent(componentName) {
    return (
      <div className="lazy-error-container">
        <div className="lazy-error-icon">⚠️</div>
        <div className="lazy-error-text">
          Failed to load {componentName.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        <button 
          className="lazy-retry-button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  /**
   * Create intersection observer target
   */
  createLazyTarget(componentName, placeholder = null) {
    const target = document.createElement('div');
    target.className = 'lazy-component-target';
    target.dataset.lazyComponent = componentName;
    
    if (placeholder) {
      target.appendChild(placeholder);
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.observe(target);
    }

    return target;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      loadedComponents: Array.from(this.loadedComponents.keys()),
      loadingComponents: Array.from(this.loadingPromises.keys()),
      cachedComponents: Array.from(this.componentCache.keys()),
      preloadQueueSize: this.preloadQueue.length
    };
  }

  /**
   * Prefetch resources based on user behavior
   */
  smartPrefetch(userInteractions) {
    const predictions = this.predictNextComponents(userInteractions);
    
    predictions.forEach(componentName => {
      if (!this.loadedComponents.has(componentName) && 
          !this.loadingPromises.has(componentName)) {
        const importFunction = this.getComponentImportFunction(componentName);
        if (importFunction) {
          this.preloadComponent(componentName, importFunction);
        }
      }
    });
  }

  /**
   * Predict next components based on user behavior
   */
  predictNextComponents(interactions) {
    const predictions = [];
    const lastInteraction = interactions[interactions.length - 1];

    if (!lastInteraction) return predictions;

    // Prediction rules based on user behavior
    switch (lastInteraction.type) {
      case 'message_hover':
        predictions.push('MessageActions');
        break;
      case 'profile_click':
        predictions.push('UserProfileModal', 'EditProfileModal');
        break;
      case 'attachment_hover':
        predictions.push('NativeCamera', 'FileManager');
        break;
      case 'video_call_button_hover':
        predictions.push('VideoCall');
        break;
      case 'settings_hover':
        predictions.push('SettingsModal');
        break;
      case 'search_focus':
        predictions.push('AdvancedSearch');
        break;
      default:
        break;
    }

    return predictions;
  }

  /**
   * Memory management - clean up unused components
   */
  cleanupUnusedComponents() {
    const componentUsage = this.getComponentUsage();
    const threshold = Date.now() - (30 * 60 * 1000); // 30 minutes ago

    Object.entries(componentUsage).forEach(([componentName, lastUsed]) => {
      if (lastUsed < threshold) {
        this.componentCache.delete(componentName);
        this.loadedComponents.delete(componentName);
      }
    });
  }

  /**
   * Get component usage statistics
   */
  getComponentUsage() {
    const usage = JSON.parse(localStorage.getItem('componentUsage') || '{}');
    return usage;
  }

  /**
   * Update component usage
   */
  updateComponentUsage(componentName) {
    const usage = this.getComponentUsage();
    usage[componentName] = Date.now();
    localStorage.setItem('componentUsage', JSON.stringify(usage));
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.loadedComponents.clear();
    this.loadingPromises.clear();
    this.componentCache.clear();
    this.preloadQueue = [];
  }
}

/**
 * Error Boundary Component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Error in lazy component ${this.props.componentName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="lazy-error-container">
          <div className="lazy-error-icon">⚠️</div>
          <div className="lazy-error-text">
            Component failed to load
          </div>
          <button 
            className="lazy-retry-button"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// CSS for lazy loading components
const lazyLoadingCSS = `
/* Lazy Loading Styles */
.lazy-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 200px;
}

.lazy-loading-spinner {
  margin-bottom: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.lazy-loading-text {
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.lazy-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 200px;
  text-align: center;
}

.lazy-error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.lazy-error-text {
  color: #dc2626;
  font-size: 16px;
  margin-bottom: 20px;
  max-width: 300px;
}

.lazy-retry-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.lazy-retry-button:hover {
  background: #2563eb;
}

.lazy-component-target {
  min-height: 1px;
  display: block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .lazy-loading-container,
  .lazy-error-container {
    min-height: 150px;
    padding: 30px 15px;
  }
  
  .lazy-error-icon {
    font-size: 36px;
  }
  
  .lazy-error-text {
    font-size: 14px;
  }
  
  .lazy-retry-button {
    padding: 10px 20px;
    font-size: 13px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: #6b7280;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .lazy-loading-text {
    color: #9ca3af;
  }
  
  .spinner {
    border-color: #374151;
    border-top-color: #60a5fa;
  }
}
`;

// Inject CSS
function injectLazyLoadingStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = lazyLoadingCSS;
  document.head.appendChild(styleElement);
}

// Auto-initialize
if (typeof document !== 'undefined') {
  injectLazyLoadingStyles();
}

// Create singleton instance
const lazyLoadingService = new LazyLoadingService();

export default lazyLoadingService;
export { LazyLoadingService };