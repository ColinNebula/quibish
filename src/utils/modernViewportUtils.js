/**
 * Modern Viewport and Display Utilities
 * Enhanced support for latest smartphones and display technologies
 * Supports: iPhone 15 Pro, Samsung Galaxy S24, foldable devices, high refresh rates
 */

// Modern viewport unit detection and fallbacks
const ViewportUnits = {
  // Check support for new viewport units
  supports: {
    dvh: CSS.supports('height', '100dvh'),
    svh: CSS.supports('height', '100svh'),
    lvh: CSS.supports('height', '100lvh'),
    dvw: CSS.supports('width', '100dvw'),
    svw: CSS.supports('width', '100svw'),
    lvw: CSS.supports('width', '100lvw'),
    container: CSS.supports('container-type', 'inline-size'),
    safeArea: CSS.supports('padding', 'env(safe-area-inset-top)')
  },

  // Set modern viewport CSS custom properties
  setModernViewport: () => {
    const root = document.documentElement;
    
    // Get all viewport dimensions
    const vh = window.innerHeight * 0.01;
    const vw = window.innerWidth * 0.01;
    const vmin = Math.min(window.innerHeight, window.innerWidth) * 0.01;
    const vmax = Math.max(window.innerHeight, window.innerWidth) * 0.01;
    
    // Set custom properties with fallbacks
    root.style.setProperty('--vh-modern', `${vh}px`);
    root.style.setProperty('--vw-modern', `${vw}px`);
    root.style.setProperty('--vmin-modern', `${vmin}px`);
    root.style.setProperty('--vmax-modern', `${vmax}px`);
    
    // Calculate safe viewport (excluding UI chrome)
    const safeVh = (window.innerHeight - (window.outerHeight - window.innerHeight)) * 0.01;
    root.style.setProperty('--svh-fallback', `${Math.max(vh, safeVh)}px`);
    
    // Large viewport (maximum possible)
    const largeVh = window.screen.height * 0.01;
    root.style.setProperty('--lvh-fallback', `${largeVh}px`);
  },

  // Initialize viewport tracking
  init: () => {
    ViewportUnits.setModernViewport();
    
    // Update on resize with debouncing
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(ViewportUnits.setModernViewport, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(ViewportUnits.setModernViewport, 200);
    });
    
    // Visual viewport API support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', () => {
        const scrollOffset = window.visualViewport.offsetTop;
        document.documentElement.style.setProperty('--visual-viewport-offset', `${scrollOffset}px`);
      });
    }
  }
};

// High refresh rate display support
const HighRefreshDisplay = {
  refreshRate: 60, // Default fallback
  
  // Detect display refresh rate
  detectRefreshRate: () => {
    return new Promise((resolve) => {
      let start = null;
      let frames = 0;
      
      const measure = (timestamp) => {
        if (!start) start = timestamp;
        frames++;
        
        if (timestamp - start >= 1000) {
          HighRefreshDisplay.refreshRate = Math.round(frames);
          resolve(HighRefreshDisplay.refreshRate);
        } else {
          requestAnimationFrame(measure);
        }
      };
      
      requestAnimationFrame(measure);
    });
  },

  // Optimize animations for high refresh rates
  optimizeAnimations: () => {
    const root = document.documentElement;
    
    if (HighRefreshDisplay.refreshRate >= 120) {
      root.classList.add('high-refresh-display');
      root.style.setProperty('--animation-duration-multiplier', '0.83'); // Faster for 120Hz
      root.style.setProperty('--scroll-behavior', 'smooth');
    } else if (HighRefreshDisplay.refreshRate >= 90) {
      root.classList.add('medium-refresh-display');
      root.style.setProperty('--animation-duration-multiplier', '0.9');
    } else {
      root.classList.add('standard-refresh-display');
      root.style.setProperty('--animation-duration-multiplier', '1');
    }
    
    console.log(`Display refresh rate: ${HighRefreshDisplay.refreshRate}Hz`);
  },

  init: async () => {
    await HighRefreshDisplay.detectRefreshRate();
    HighRefreshDisplay.optimizeAnimations();
  }
};

// Enhanced device detection for latest smartphones
const ModernDeviceDetection = {
  // Device database with latest models
  devices: {
    // iPhone models
    'iPhone15,2': { name: 'iPhone 14 Pro', safeAreas: { top: 59, bottom: 34 }, hasDynamicIsland: true },
    'iPhone15,3': { name: 'iPhone 14 Pro Max', safeAreas: { top: 59, bottom: 34 }, hasDynamicIsland: true },
    'iPhone16,1': { name: 'iPhone 15', safeAreas: { top: 59, bottom: 34 }, hasDynamicIsland: true },
    'iPhone16,2': { name: 'iPhone 15 Plus', safeAreas: { top: 59, bottom: 34 }, hasDynamicIsland: true },
    'iPhone16,3': { name: 'iPhone 15 Pro', safeAreas: { top: 59, bottom: 34 }, hasDynamicIsland: true },
    'iPhone16,4': { name: 'iPhone 15 Pro Max', safeAreas: { top: 59, bottom: 34 }, hasDynamicIsland: true },
    
    // Samsung Galaxy models
    'SM-S918': { name: 'Galaxy S23 Ultra', safeAreas: { top: 32, bottom: 20 }, hasEdgeDisplay: true },
    'SM-S926': { name: 'Galaxy S24', safeAreas: { top: 32, bottom: 20 }, hasEdgeDisplay: true },
    'SM-S928': { name: 'Galaxy S24 Ultra', safeAreas: { top: 32, bottom: 20 }, hasEdgeDisplay: true },
    
    // Foldable devices
    'SM-F946': { name: 'Galaxy Z Fold5', safeAreas: { top: 32, bottom: 20 }, isFoldable: true },
    'SM-F731': { name: 'Galaxy Z Flip5', safeAreas: { top: 32, bottom: 20 }, isFoldable: true }
  },

  // Detect current device
  detectDevice: () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // iPhone detection
    if (platform.includes('iPhone')) {
      const screenHeight = Math.max(window.screen.height, window.screen.width);
      const screenWidth = Math.min(window.screen.height, window.screen.width);
      const pixelRatio = window.devicePixelRatio;
      
      // iPhone 15 Pro (393x852)
      if (screenWidth === 393 && screenHeight === 852 && pixelRatio === 3) {
        return { ...ModernDeviceDetection.devices['iPhone16,3'], detected: true };
      }
      // iPhone 14 Pro (390x844)
      else if (screenWidth === 390 && screenHeight === 844 && pixelRatio === 3) {
        return { ...ModernDeviceDetection.devices['iPhone15,2'], detected: true };
      }
    }
    
    // Android detection
    if (userAgent.includes('Android')) {
      for (const [model, info] of Object.entries(ModernDeviceDetection.devices)) {
        if (userAgent.includes(model)) {
          return { ...info, detected: true };
        }
      }
    }
    
    // Foldable detection
    if (window.screen?.isExtended || CSS.supports('(orientation: fold)')) {
      return { name: 'Foldable Device', isFoldable: true, detected: true };
    }
    
    return { name: 'Unknown Device', detected: false };
  },

  // Apply device-specific optimizations
  applyDeviceOptimizations: (device) => {
    const root = document.documentElement;
    
    if (device.detected) {
      root.classList.add('modern-device');
      
      if (device.hasDynamicIsland) {
        root.classList.add('has-dynamic-island');
        root.style.setProperty('--dynamic-island-height', '37px');
      }
      
      if (device.hasEdgeDisplay) {
        root.classList.add('has-edge-display');
      }
      
      if (device.isFoldable) {
        root.classList.add('foldable-device');
        ModernDeviceDetection.setupFoldableSupport();
      }
      
      // Set device-specific safe areas
      if (device.safeAreas) {
        root.style.setProperty('--device-safe-top', `${device.safeAreas.top}px`);
        root.style.setProperty('--device-safe-bottom', `${device.safeAreas.bottom}px`);
      }
      
      console.log(`Detected device: ${device.name}`);
    }
  },

  // Foldable device support
  setupFoldableSupport: () => {
    // Screen spanning API
    if (window.screen.isExtended) {
      document.documentElement.classList.add('dual-screen');
    }
    
    // Fold detection
    if (CSS.supports('(orientation: fold)')) {
      const mediaQuery = window.matchMedia('(orientation: fold)');
      const handleFoldChange = (e) => {
        document.documentElement.classList.toggle('folded', e.matches);
      };
      
      mediaQuery.addListener(handleFoldChange);
      handleFoldChange(mediaQuery);
    }
    
    // Visual viewport changes for foldables
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const aspectRatio = window.visualViewport.width / window.visualViewport.height;
        document.documentElement.style.setProperty('--viewport-aspect-ratio', aspectRatio);
      });
    }
  }
};

// Enhanced safe area support
const SafeAreaEnhanced = {
  // Get computed safe area values
  getSafeAreaValues: () => {
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0')
    };
  },

  // Apply enhanced safe area handling
  applySafeAreas: () => {
    const root = document.documentElement;
    
    // Set CSS custom properties for safe areas with fallbacks
    const safeAreaCSS = `
      --safe-area-top: max(env(safe-area-inset-top, 0px), var(--device-safe-top, 0px));
      --safe-area-right: max(env(safe-area-inset-right, 0px), 0px);
      --safe-area-bottom: max(env(safe-area-inset-bottom, 0px), var(--device-safe-bottom, 0px));
      --safe-area-left: max(env(safe-area-inset-left, 0px), 0px);
      
      /* Combined safe viewport */
      --safe-vh: calc(100vh - var(--safe-area-top) - var(--safe-area-bottom));
      --safe-vw: calc(100vw - var(--safe-area-left) - var(--safe-area-right));
    `;
    
    // Apply styles
    const style = document.createElement('style');
    style.textContent = `:root { ${safeAreaCSS} }`;
    document.head.appendChild(style);
    
    // Monitor safe area changes
    const observer = new ResizeObserver(() => {
      SafeAreaEnhanced.updateSafeAreaClasses();
    });
    observer.observe(document.documentElement);
  },

  // Update classes based on safe area presence
  updateSafeAreaClasses: () => {
    const safeAreas = SafeAreaEnhanced.getSafeAreaValues();
    const root = document.documentElement;
    
    root.classList.toggle('has-safe-area-top', safeAreas.top > 0);
    root.classList.toggle('has-safe-area-bottom', safeAreas.bottom > 0);
    root.classList.toggle('has-safe-area-sides', safeAreas.left > 0 || safeAreas.right > 0);
  }
};

// Main initialization function
export const initModernViewport = async () => {
  console.log('🔧 Initializing modern viewport support...');
  
  // Initialize viewport units
  ViewportUnits.init();
  
  // Detect and optimize for refresh rate
  await HighRefreshDisplay.init();
  
  // Device detection and optimization
  const device = ModernDeviceDetection.detectDevice();
  ModernDeviceDetection.applyDeviceOptimizations(device);
  
  // Enhanced safe area support
  SafeAreaEnhanced.applySafeAreas();
  
  console.log('✅ Modern viewport support initialized');
  
  return {
    device,
    refreshRate: HighRefreshDisplay.refreshRate,
    viewportSupport: ViewportUnits.supports
  };
};

// Export utilities
export {
  ViewportUnits,
  HighRefreshDisplay,
  ModernDeviceDetection,
  SafeAreaEnhanced
};

export default {
  initModernViewport,
  ViewportUnits,
  HighRefreshDisplay,
  ModernDeviceDetection,
  SafeAreaEnhanced
};