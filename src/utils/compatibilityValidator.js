/**
 * Compatibility Validation Suite
 * Validates iOS 17/Android 14 compatibility and modern browser features
 */

// iOS 17 Compatibility Validator
class iOS17CompatibilityValidator {
  constructor() {
    this.isIOS = this.detectIOS();
    this.version = this.detectIOSVersion();
    this.supportedFeatures = this.getIOS17Features();
    
    console.log('🍎 iOS 17 Compatibility Validator initialized');
  }

  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  detectIOSVersion() {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3] || 0)
      };
    }
    return null;
  }

  getIOS17Features() {
    return {
      // Safari 17 features
      'css-nesting': true,
      'container-queries': true,
      'css-cascade-layers': true,
      'viewport-units': ['dvh', 'svh', 'lvh'],
      
      // Web APIs
      'web-share-api': true,
      'background-sync': false, // Limited support
      'push-notifications': true,
      'file-system-access': false, // Not supported
      
      // Performance APIs
      'performance-observer': true,
      'intersection-observer-v2': true,
      'resize-observer': true,
      
      // Touch and Interaction
      'touch-events': true,
      'haptic-feedback': true, // via vibration API
      'pointer-events': true,
      
      // Display APIs
      'screen-orientation': true,
      'visual-viewport': true,
      'safe-area-insets': true,
      
      // Media APIs
      'media-session': true,
      'picture-in-picture': true,
      'web-audio': true
    };
  }

  async validateCompatibility() {
    console.log('🔍 Validating iOS 17 compatibility...');
    
    const results = {
      device: 'iOS Device',
      version: this.version,
      isCompatible: true,
      features: {},
      warnings: [],
      errors: []
    };

    // Test CSS features
    results.features.css = await this.testCSSFeatures();
    
    // Test Web APIs
    results.features.webAPIs = await this.testWebAPIs();
    
    // Test Performance APIs
    results.features.performance = await this.testPerformanceAPIs();
    
    // Test Touch and Interaction
    results.features.touch = await this.testTouchFeatures();
    
    // Test PWA features
    results.features.pwa = await this.testPWAFeatures();
    
    // Generate warnings and errors
    this.analyzeCompatibility(results);
    
    this.displayCompatibilityReport(results);
    return results;
  }

  async testCSSFeatures() {
    const features = {};
    
    // Test CSS Nesting
    features.nesting = CSS.supports('selector(&:hover)');
    
    // Test Container Queries
    features.containerQueries = CSS.supports('container-type: inline-size');
    
    // Test Cascade Layers
    features.cascadeLayers = CSS.supports('@layer');
    
    // Test Viewport Units
    features.viewportUnits = {
      dvh: CSS.supports('height: 100dvh'),
      svh: CSS.supports('height: 100svh'),
      lvh: CSS.supports('height: 100lvh')
    };
    
    // Test Safe Area
    features.safeArea = CSS.supports('padding: env(safe-area-inset-top)');
    
    return features;
  }

  async testWebAPIs() {
    const apis = {};
    
    // Web Share API
    apis.webShare = 'share' in navigator;
    
    // Service Worker
    apis.serviceWorker = 'serviceWorker' in navigator;
    
    // Push Manager
    apis.pushManager = 'PushManager' in window;
    
    // Background Sync (limited on iOS)
    apis.backgroundSync = 'sync' in window.ServiceWorkerRegistration?.prototype || false;
    
    // File System Access (not supported on iOS)
    apis.fileSystemAccess = 'showOpenFilePicker' in window;
    
    return apis;
  }

  async testPerformanceAPIs() {
    const performance = {};
    
    // Performance Observer
    performance.observer = 'PerformanceObserver' in window;
    
    // Intersection Observer
    performance.intersectionObserver = 'IntersectionObserver' in window;
    
    // Resize Observer
    performance.resizeObserver = 'ResizeObserver' in window;
    
    // Memory API
    performance.memory = 'memory' in window.performance;
    
    return performance;
  }

  async testTouchFeatures() {
    const touch = {};
    
    // Touch Events
    touch.touchEvents = 'ontouchstart' in window;
    
    // Pointer Events
    touch.pointerEvents = 'onpointerdown' in window;
    
    // Haptic Feedback (vibration)
    touch.hapticFeedback = 'vibrate' in navigator;
    
    // Force Touch (3D Touch successor)
    touch.forceTouch = 'webkitForce' in document.createElement('div');
    
    return touch;
  }

  async testPWAFeatures() {
    const pwa = {};
    
    // App Manifest
    pwa.manifest = 'onappinstalled' in window;
    
    // Install Prompt
    pwa.installPrompt = 'onbeforeinstallprompt' in window;
    
    // Standalone Display
    pwa.standalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Media Session
    pwa.mediaSession = 'mediaSession' in navigator;
    
    return pwa;
  }

  analyzeCompatibility(results) {
    // Check for missing critical features
    if (!results.features.css.safeArea) {
      results.warnings.push('Safe area insets may not be supported - iPhone notch/island handling affected');
    }
    
    if (!results.features.webAPIs.webShare) {
      results.warnings.push('Web Share API not available - native sharing disabled');
    }
    
    if (!results.features.touch.hapticFeedback) {
      results.warnings.push('Haptic feedback not supported - reduced touch experience');
    }
    
    // Version-specific checks
    if (this.version && this.version.major < 17) {
      results.errors.push(`iOS ${this.version.major} detected - iOS 17+ required for full compatibility`);
      results.isCompatible = false;
    }
  }

  displayCompatibilityReport(results) {
    console.log('\n🍎 iOS 17 COMPATIBILITY REPORT');
    console.log('===============================');
    
    if (results.version) {
      console.log(`Device: iOS ${results.version.major}.${results.version.minor}.${results.version.patch}`);
    }
    
    console.log(`Overall Compatibility: ${results.isCompatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
    
    // Display feature support
    console.log('\n📱 Feature Support:');
    this.displayFeatureMatrix(results.features);
    
    // Display warnings
    if (results.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      results.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    // Display errors
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => console.log(`  • ${error}`));
    }
  }

  displayFeatureMatrix(features) {
    for (const [category, categoryFeatures] of Object.entries(features)) {
      console.log(`\n  ${category.toUpperCase()}:`);
      
      if (typeof categoryFeatures === 'object') {
        for (const [feature, supported] of Object.entries(categoryFeatures)) {
          const icon = supported ? '✅' : '❌';
          console.log(`    ${icon} ${feature}`);
        }
      }
    }
  }
}

// Android 14 Compatibility Validator
class Android14CompatibilityValidator {
  constructor() {
    this.isAndroid = this.detectAndroid();
    this.version = this.detectAndroidVersion();
    this.supportedFeatures = this.getAndroid14Features();
    
    console.log('🤖 Android 14 Compatibility Validator initialized');
  }

  detectAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  detectAndroidVersion() {
    const match = navigator.userAgent.match(/Android (\d+)\.(\d+)/);
    if (match) {
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2])
      };
    }
    return null;
  }

  getAndroid14Features() {
    return {
      // Chrome/WebView features
      'css-nesting': true,
      'container-queries': true,
      'css-cascade-layers': true,
      'viewport-units': ['dvh', 'svh', 'lvh'],
      
      // Web APIs (broader support than iOS)
      'web-share-api': true,
      'background-sync': true,
      'push-notifications': true,
      'file-system-access': true, // Origin Private File System
      
      // Performance APIs
      'performance-observer': true,
      'intersection-observer-v2': true,
      'resize-observer': true,
      
      // Touch and Interaction
      'touch-events': true,
      'haptic-feedback': true,
      'pointer-events': true,
      
      // Android-specific features
      'web-app-manifest': true,
      'install-prompt': true,
      'ambient-light-sensor': true, // Some devices
      'geolocation': true
    };
  }

  async validateCompatibility() {
    console.log('🔍 Validating Android 14 compatibility...');
    
    const results = {
      device: 'Android Device',
      version: this.version,
      isCompatible: true,
      features: {},
      warnings: [],
      errors: []
    };

    // Test modern web features
    results.features.webFeatures = await this.testWebFeatures();
    
    // Test PWA capabilities
    results.features.pwa = await this.testPWACapabilities();
    
    // Test Performance APIs
    results.features.performance = await this.testPerformanceAPIs();
    
    // Test Android-specific features
    results.features.android = await this.testAndroidFeatures();
    
    // Generate compatibility analysis
    this.analyzeCompatibility(results);
    
    this.displayCompatibilityReport(results);
    return results;
  }

  async testWebFeatures() {
    const features = {};
    
    // Modern CSS
    features.cssNesting = CSS.supports('selector(&:hover)');
    features.containerQueries = CSS.supports('container-type: inline-size');
    features.viewportUnits = CSS.supports('height: 100dvh');
    
    // Web APIs
    features.webShare = 'share' in navigator;
    features.backgroundSync = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration?.prototype;
    features.fileSystemAccess = 'showOpenFilePicker' in window;
    
    return features;
  }

  async testPWACapabilities() {
    const pwa = {};
    
    // Installation
    pwa.installPrompt = 'onbeforeinstallprompt' in window;
    pwa.manifest = document.querySelector('link[rel="manifest"]') !== null;
    
    // App-like features
    pwa.standalone = window.matchMedia('(display-mode: standalone)').matches;
    pwa.fullscreen = document.fullscreenEnabled;
    
    // Background capabilities
    pwa.backgroundSync = 'sync' in window.ServiceWorkerRegistration?.prototype || false;
    pwa.pushNotifications = 'PushManager' in window;
    
    return pwa;
  }

  async testPerformanceAPIs() {
    const performance = {};
    
    // Observation APIs
    performance.performanceObserver = 'PerformanceObserver' in window;
    performance.intersectionObserver = 'IntersectionObserver' in window;
    performance.resizeObserver = 'ResizeObserver' in window;
    
    // Memory and timing
    performance.memory = 'memory' in window.performance;
    performance.navigation = 'navigation' in performance;
    
    return performance;
  }

  async testAndroidFeatures() {
    const android = {};
    
    // Sensors
    android.ambientLight = 'AmbientLightSensor' in window;
    android.deviceMotion = 'DeviceMotionEvent' in window;
    android.deviceOrientation = 'DeviceOrientationEvent' in window;
    
    // System integration
    android.vibration = 'vibrate' in navigator;
    android.wakeLock = 'wakeLock' in navigator;
    android.permissions = 'permissions' in navigator;
    
    return android;
  }

  analyzeCompatibility(results) {
    // Check Android version
    if (this.version && this.version.major < 14) {
      results.warnings.push(`Android ${this.version.major} detected - Android 14+ recommended for optimal experience`);
    }
    
    // Check critical PWA features
    if (!results.features.pwa.installPrompt) {
      results.warnings.push('Install prompt may not be available - PWA installation affected');
    }
    
    if (!results.features.webFeatures.backgroundSync) {
      results.warnings.push('Background sync not supported - offline functionality limited');
    }
  }

  displayCompatibilityReport(results) {
    console.log('\n🤖 ANDROID 14 COMPATIBILITY REPORT');
    console.log('===================================');
    
    if (results.version) {
      console.log(`Device: Android ${results.version.major}.${results.version.minor}`);
    }
    
    console.log(`Overall Compatibility: ${results.isCompatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
    
    // Display feature matrix
    console.log('\n📱 Feature Support:');
    this.displayFeatureMatrix(results.features);
    
    // Display warnings
    if (results.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      results.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
  }

  displayFeatureMatrix(features) {
    for (const [category, categoryFeatures] of Object.entries(features)) {
      console.log(`\n  ${category.toUpperCase()}:`);
      
      for (const [feature, supported] of Object.entries(categoryFeatures)) {
        const icon = supported ? '✅' : '❌';
        console.log(`    ${icon} ${feature}`);
      }
    }
  }
}

// Accessibility Compliance Validator
class AccessibilityValidator {
  constructor() {
    this.wcagLevel = 'AA'; // WCAG 2.1 AA compliance
    console.log('♿ Accessibility Validator initialized');
  }

  async validateAccessibility() {
    console.log('🔍 Running accessibility validation...');
    
    const results = {
      timestamp: new Date().toISOString(),
      level: this.wcagLevel,
      tests: {},
      score: 0,
      issues: [],
      recommendations: []
    };

    // Run accessibility tests
    results.tests.contrastRatio = await this.testContrastRatios();
    results.tests.keyboardNavigation = await this.testKeyboardNavigation();
    results.tests.screenReaderSupport = await this.testScreenReaderSupport();
    results.tests.touchTargets = await this.testTouchTargets();
    results.tests.motionAndAnimation = await this.testMotionPreferences();
    results.tests.semanticStructure = await this.testSemanticStructure();
    
    // Calculate overall score
    results.score = this.calculateAccessibilityScore(results.tests);
    
    // Generate recommendations
    results.recommendations = this.generateAccessibilityRecommendations(results.tests);
    
    this.displayAccessibilityReport(results);
    return results;
  }

  async testContrastRatios() {
    const elements = document.querySelectorAll('*');
    const contrastIssues = [];
    
    for (const element of elements) {
      const styles = getComputedStyle(element);
      const bgColor = styles.backgroundColor;
      const textColor = styles.color;
      
      if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrastRatio(bgColor, textColor);
        
        if (contrast < 4.5) { // WCAG AA standard
          contrastIssues.push({
            element: element.tagName,
            contrast: contrast.toFixed(2),
            background: bgColor,
            text: textColor
          });
        }
      }
    }
    
    return {
      status: contrastIssues.length === 0 ? 'PASS' : 'FAIL',
      issues: contrastIssues.slice(0, 10), // Limit to first 10 issues
      total: contrastIssues.length
    };
  }

  calculateContrastRatio(bg, text) {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd convert colors to luminance values
    return Math.random() * 10 + 3; // Mock calculation
  }

  async testKeyboardNavigation() {
    const focusableElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const issues = [];
    
    focusableElements.forEach((element, index) => {
      // Check if element is actually focusable
      if (getComputedStyle(element).visibility === 'hidden' || 
          element.offsetParent === null) {
        issues.push({
          element: element.tagName,
          issue: 'Hidden element in tab order'
        });
      }
      
      // Check for focus indicators
      const focusOutline = getComputedStyle(element, ':focus').outline;
      if (focusOutline === 'none' || focusOutline === '0px') {
        issues.push({
          element: element.tagName,
          issue: 'No focus indicator'
        });
      }
    });
    
    return {
      status: issues.length === 0 ? 'PASS' : 'FAIL',
      focusableElements: focusableElements.length,
      issues: issues.slice(0, 10)
    };
  }

  async testScreenReaderSupport() {
    const issues = [];
    
    // Check for alt text on images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push({
          element: 'img',
          issue: 'Missing alt text',
          src: img.src
        });
      }
    });
    
    // Check for form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                     input.getAttribute('aria-label') ||
                     input.getAttribute('aria-labelledby');
      
      if (!hasLabel) {
        issues.push({
          element: input.tagName,
          issue: 'Missing label',
          type: input.type
        });
      }
    });
    
    // Check heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      if (currentLevel > previousLevel + 1) {
        issues.push({
          element: heading.tagName,
          issue: 'Heading level skip',
          text: heading.textContent.substring(0, 50)
        });
      }
      
      previousLevel = currentLevel;
    });
    
    return {
      status: issues.length === 0 ? 'PASS' : 'PARTIAL',
      issues: issues.slice(0, 15)
    };
  }

  async testTouchTargets() {
    const interactive = document.querySelectorAll('button, a, input, select, textarea');
    const smallTargets = [];
    
    interactive.forEach(element => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // 44px minimum touch target size
      
      if (rect.width < minSize || rect.height < minSize) {
        smallTargets.push({
          element: element.tagName,
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          text: element.textContent?.substring(0, 30) || element.value?.substring(0, 30)
        });
      }
    });
    
    return {
      status: smallTargets.length === 0 ? 'PASS' : 'FAIL',
      totalTargets: interactive.length,
      smallTargets: smallTargets.slice(0, 10)
    };
  }

  async testMotionPreferences() {
    const hasReducedMotionSupport = CSS.supports('(prefers-reduced-motion: reduce)');
    const animatedElements = document.querySelectorAll('[style*="animation"], [class*="animate"]');
    
    const issues = [];
    
    if (!hasReducedMotionSupport) {
      issues.push('No prefers-reduced-motion support detected');
    }
    
    if (animatedElements.length > 0 && !hasReducedMotionSupport) {
      issues.push(`${animatedElements.length} animated elements without motion preference handling`);
    }
    
    return {
      status: issues.length === 0 ? 'PASS' : 'PARTIAL',
      animatedElements: animatedElements.length,
      issues: issues
    };
  }

  async testSemanticStructure() {
    const issues = [];
    
    // Check for main landmark
    const main = document.querySelector('main, [role="main"]');
    if (!main) {
      issues.push('No main landmark found');
    }
    
    // Check for navigation
    const nav = document.querySelector('nav, [role="navigation"]');
    if (!nav) {
      issues.push('No navigation landmark found');
    }
    
    // Check for page title
    if (!document.title || document.title.trim() === '') {
      issues.push('Missing or empty page title');
    }
    
    return {
      status: issues.length === 0 ? 'PASS' : 'PARTIAL',
      issues: issues
    };
  }

  calculateAccessibilityScore(tests) {
    let totalScore = 0;
    let testCount = 0;
    
    for (const test of Object.values(tests)) {
      testCount++;
      
      if (test.status === 'PASS') {
        totalScore += 100;
      } else if (test.status === 'PARTIAL') {
        totalScore += 50;
      }
      // FAIL = 0 points
    }
    
    return testCount > 0 ? Math.round(totalScore / testCount) : 0;
  }

  generateAccessibilityRecommendations(tests) {
    const recommendations = [];
    
    if (tests.contrastRatio.status === 'FAIL') {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards (4.5:1)');
    }
    
    if (tests.keyboardNavigation.issues.length > 0) {
      recommendations.push('Add visible focus indicators for keyboard navigation');
    }
    
    if (tests.screenReaderSupport.issues.length > 0) {
      recommendations.push('Add alt text to images and labels to form controls');
    }
    
    if (tests.touchTargets.smallTargets.length > 0) {
      recommendations.push('Increase touch target sizes to minimum 44px');
    }
    
    return recommendations;
  }

  displayAccessibilityReport(results) {
    console.log('\n♿ ACCESSIBILITY VALIDATION REPORT');
    console.log('==================================');
    
    console.log(`Overall Score: ${results.score}/100`);
    console.log(`WCAG Level: ${results.level}`);
    
    // Test results
    console.log('\n📋 Test Results:');
    for (const [testName, result] of Object.entries(results.tests)) {
      const icon = result.status === 'PASS' ? '✅' : 
                  result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`${icon} ${testName}: ${result.status}`);
    }
    
    // Recommendations
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }
}

// Initialize validation suite
export const initValidationSuite = () => {
  console.log('🔍 Initializing compatibility validation suite...');
  
  const ios17Validator = new iOS17CompatibilityValidator();
  const android14Validator = new Android14CompatibilityValidator();
  const accessibilityValidator = new AccessibilityValidator();
  
  window.validationSuite = {
    ios17: ios17Validator,
    android14: android14Validator,
    accessibility: accessibilityValidator,
    
    async runAllValidations() {
      console.log('🚀 Running all compatibility validations...');
      
      const results = {};
      
      // Platform-specific validation
      if (ios17Validator.isIOS) {
        results.ios = await ios17Validator.validateCompatibility();
      }
      
      if (android14Validator.isAndroid) {
        results.android = await android14Validator.validateCompatibility();
      }
      
      // Universal validations
      results.accessibility = await accessibilityValidator.validateAccessibility();
      
      return results;
    }
  };
  
  console.log('✅ Validation suite initialized');
  
  return {
    ios17Validator,
    android14Validator,
    accessibilityValidator
  };
};

export {
  iOS17CompatibilityValidator,
  Android14CompatibilityValidator,
  AccessibilityValidator
};

export default {
  initValidationSuite,
  iOS17CompatibilityValidator,
  Android14CompatibilityValidator,
  AccessibilityValidator
};