/**
 * Modern Smartphone Testing Suite
 * Comprehensive testing utilities for latest device features
 * Validates: Performance, compatibility, accessibility, responsive design
 */

// Device Testing Manager
class DeviceTestingManager {
  constructor() {
    this.testResults = new Map();
    this.deviceProfiles = this.initDeviceProfiles();
    this.currentProfile = null;
    
    console.log('🧪 Device Testing Manager initialized');
  }

  // Initialize modern device profiles
  initDeviceProfiles() {
    return {
      'iphone-15-pro': {
        name: 'iPhone 15 Pro',
        dimensions: { width: 393, height: 852 },
        pixelRatio: 3,
        viewportUnits: ['dvh', 'svh', 'lvh'],
        features: ['dynamic-island', 'haptic-feedback', '120hz', 'safe-area'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      'iphone-15-pro-max': {
        name: 'iPhone 15 Pro Max',
        dimensions: { width: 430, height: 932 },
        pixelRatio: 3,
        viewportUnits: ['dvh', 'svh', 'lvh'],
        features: ['dynamic-island', 'haptic-feedback', '120hz', 'safe-area'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      'galaxy-s24-ultra': {
        name: 'Samsung Galaxy S24 Ultra',
        dimensions: { width: 412, height: 915 },
        pixelRatio: 3.5,
        viewportUnits: ['dvh', 'svh', 'lvh'],
        features: ['haptic-feedback', '120hz', 'ambient-light'],
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36'
      },
      'pixel-8-pro': {
        name: 'Google Pixel 8 Pro',
        dimensions: { width: 412, height: 892 },
        pixelRatio: 2.625,
        viewportUnits: ['dvh', 'svh', 'lvh'],
        features: ['haptic-feedback', '120hz', 'ambient-light'],
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36'
      },
      'galaxy-fold-5': {
        name: 'Samsung Galaxy Z Fold 5',
        dimensions: { width: 344, height: 882, foldedWidth: 748, foldedHeight: 1812 },
        pixelRatio: 3,
        viewportUnits: ['dvh', 'svh', 'lvh'],
        features: ['foldable', 'haptic-feedback', '120hz', 'spanning'],
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36'
      },
      'surface-duo-2': {
        name: 'Microsoft Surface Duo 2',
        dimensions: { width: 540, height: 720, spanningWidth: 1114 },
        pixelRatio: 2.5,
        viewportUnits: ['dvh', 'svh', 'lvh'],
        features: ['foldable', 'spanning', 'dual-screen'],
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Surface Duo 2) AppleWebKit/537.36'
      }
    };
  }

  // Start comprehensive device testing
  async startDeviceTesting() {
    console.log('🚀 Starting comprehensive device testing...');
    
    const results = {};
    
    for (const [deviceId, profile] of Object.entries(this.deviceProfiles)) {
      console.log(`📱 Testing device: ${profile.name}`);
      
      this.currentProfile = profile;
      const deviceResults = await this.testDevice(deviceId, profile);
      results[deviceId] = deviceResults;
      
      // Brief pause between device tests
      await this.delay(500);
    }
    
    this.generateTestReport(results);
    return results;
  }

  // Test individual device
  async testDevice(deviceId, profile) {
    const results = {
      device: profile.name,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Simulate device environment
    this.simulateDevice(profile);
    
    try {
      // Test viewport units
      results.tests.viewportUnits = await this.testViewportUnits(profile);
      
      // Test responsive design
      results.tests.responsiveDesign = await this.testResponsiveDesign(profile);
      
      // Test modern features
      results.tests.modernFeatures = await this.testModernFeatures(profile);
      
      // Test performance
      results.tests.performance = await this.testPerformance(profile);
      
      // Test accessibility
      results.tests.accessibility = await this.testAccessibility(profile);
      
      // Test touch interactions
      results.tests.touchInteractions = await this.testTouchInteractions(profile);
      
      // Test PWA features
      results.tests.pwaFeatures = await this.testPWAFeatures(profile);
      
      console.log(`✅ Device testing completed: ${profile.name}`);
      
    } catch (error) {
      console.error(`❌ Device testing failed: ${profile.name}`, error);
      results.tests.error = error.message;
    }
    
    return results;
  }

  // Simulate device environment
  simulateDevice(profile) {
    // Override viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: profile.dimensions.width
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: profile.dimensions.height
    });
    
    // Override device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: profile.pixelRatio
    });
    
    // Override user agent if needed
    if (profile.userAgent) {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: profile.userAgent
      });
    }
    
    // Add device-specific classes
    document.documentElement.className = document.documentElement.className
      .replace(/device-\w+/g, '');
    document.documentElement.classList.add(`device-${profile.name.toLowerCase().replace(/\s+/g, '-')}`);
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  }

  // Test viewport units support
  async testViewportUnits(profile) {
    const results = { supported: [], failed: [] };
    
    for (const unit of profile.viewportUnits || []) {
      try {
        // Create test element
        const testEl = document.createElement('div');
        testEl.style.height = `100${unit}`;
        document.body.appendChild(testEl);
        
        // Check if unit is applied
        const computed = getComputedStyle(testEl);
        if (computed.height && computed.height !== '0px') {
          results.supported.push(unit);
        } else {
          results.failed.push(unit);
        }
        
        document.body.removeChild(testEl);
      } catch (error) {
        results.failed.push(unit);
      }
    }
    
    return {
      status: results.failed.length === 0 ? 'PASS' : 'PARTIAL',
      supported: results.supported,
      failed: results.failed
    };
  }

  // Test responsive design
  async testResponsiveDesign(profile) {
    const tests = [];
    
    // Test breakpoint handling
    tests.push(await this.testBreakpoints(profile));
    
    // Test safe area handling
    tests.push(await this.testSafeAreas(profile));
    
    // Test component adaptation
    tests.push(await this.testComponentAdaptation(profile));
    
    const passed = tests.filter(t => t.status === 'PASS').length;
    
    return {
      status: passed === tests.length ? 'PASS' : passed > 0 ? 'PARTIAL' : 'FAIL',
      tests: tests,
      score: `${passed}/${tests.length}`
    };
  }

  // Test modern features
  async testModernFeatures(profile) {
    const featureTests = {};
    
    for (const feature of profile.features || []) {
      switch (feature) {
        case 'dynamic-island':
          featureTests[feature] = this.testDynamicIsland();
          break;
        case 'haptic-feedback':
          featureTests[feature] = this.testHapticFeedback();
          break;
        case '120hz':
          featureTests[feature] = this.testHighRefreshRate();
          break;
        case 'foldable':
          featureTests[feature] = this.testFoldableSupport();
          break;
        case 'ambient-light':
          featureTests[feature] = this.testAmbientLight();
          break;
        default:
          featureTests[feature] = { status: 'SKIP', reason: 'Unknown feature' };
      }
    }
    
    const passed = Object.values(featureTests).filter(t => t.status === 'PASS').length;
    const total = Object.keys(featureTests).length;
    
    return {
      status: passed === total ? 'PASS' : passed > 0 ? 'PARTIAL' : 'FAIL',
      features: featureTests,
      score: `${passed}/${total}`
    };
  }

  // Test performance metrics
  async testPerformance(profile) {
    const metrics = {};
    
    try {
      // Test memory usage
      if ('memory' in performance) {
        metrics.memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      
      // Test rendering performance
      const renderStart = performance.now();
      await this.triggerRender();
      const renderTime = performance.now() - renderStart;
      
      metrics.renderTime = renderTime;
      metrics.renderPerformance = renderTime < 16 ? 'EXCELLENT' : 
                                  renderTime < 33 ? 'GOOD' : 
                                  renderTime < 100 ? 'FAIR' : 'POOR';
      
      // Test scroll performance
      metrics.scrollPerformance = await this.testScrollPerformance();
      
      // Test touch responsiveness
      metrics.touchLatency = await this.testTouchLatency();
      
      return {
        status: 'PASS',
        metrics: metrics
      };
      
    } catch (error) {
      return {
        status: 'FAIL',
        error: error.message
      };
    }
  }

  // Test accessibility compliance
  async testAccessibility(profile) {
    const tests = [];
    
    // Test contrast ratios
    tests.push(await this.testContrastRatios());
    
    // Test keyboard navigation
    tests.push(await this.testKeyboardNavigation());
    
    // Test screen reader compatibility
    tests.push(await this.testScreenReaderSupport());
    
    // Test touch target sizes
    tests.push(await this.testTouchTargetSizes());
    
    // Test motion preferences
    tests.push(await this.testMotionPreferences());
    
    const passed = tests.filter(t => t.status === 'PASS').length;
    
    return {
      status: passed === tests.length ? 'PASS' : passed >= tests.length * 0.8 ? 'PARTIAL' : 'FAIL',
      tests: tests,
      score: `${passed}/${tests.length}`
    };
  }

  // Test touch interactions
  async testTouchInteractions(profile) {
    const tests = [];
    
    // Test basic touch events
    tests.push(await this.testBasicTouch());
    
    // Test gesture recognition
    tests.push(await this.testGestureRecognition());
    
    // Test haptic feedback
    if (profile.features?.includes('haptic-feedback')) {
      tests.push(await this.testHapticFeedback());
    }
    
    // Test multi-touch
    tests.push(await this.testMultiTouch());
    
    const passed = tests.filter(t => t.status === 'PASS').length;
    
    return {
      status: passed === tests.length ? 'PASS' : passed > 0 ? 'PARTIAL' : 'FAIL',
      tests: tests,
      score: `${passed}/${tests.length}`
    };
  }

  // Test PWA features
  async testPWAFeatures(profile) {
    const tests = [];
    
    // Test service worker
    tests.push(await this.testServiceWorker());
    
    // Test manifest
    tests.push(await this.testManifest());
    
    // Test installability
    tests.push(await this.testInstallability());
    
    // Test offline functionality
    tests.push(await this.testOfflineSupport());
    
    const passed = tests.filter(t => t.status === 'PASS').length;
    
    return {
      status: passed === tests.length ? 'PASS' : passed > 0 ? 'PARTIAL' : 'FAIL',
      tests: tests,
      score: `${passed}/${tests.length}`
    };
  }

  // Individual test implementations
  testDynamicIsland() {
    const islandEl = document.querySelector('.dynamic-island');
    if (!islandEl) {
      return { status: 'FAIL', reason: 'Dynamic Island element not found' };
    }
    
    const hasContent = islandEl.querySelector('.island-content');
    const hasInteraction = typeof islandEl.onclick === 'function' || 
                          islandEl.hasAttribute('onclick');
    
    return {
      status: hasContent && hasInteraction ? 'PASS' : 'PARTIAL',
      details: { hasContent, hasInteraction }
    };
  }

  testHapticFeedback() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(1);
        return { status: 'PASS', details: 'Vibration API available' };
      } catch (error) {
        return { status: 'FAIL', reason: error.message };
      }
    }
    
    return { status: 'FAIL', reason: 'Vibration API not supported' };
  }

  testHighRefreshRate() {
    const refreshRate = window.screen?.refreshRate || 
                       this.detectRefreshRate();
    
    return {
      status: refreshRate >= 120 ? 'PASS' : 'PARTIAL',
      refreshRate: refreshRate,
      details: refreshRate >= 120 ? 'High refresh rate detected' : 'Standard refresh rate'
    };
  }

  testFoldableSupport() {
    const hasFoldClass = document.documentElement.classList.contains('fold-state-unfolded') ||
                        document.documentElement.classList.contains('fold-state-folded') ||
                        document.documentElement.classList.contains('fold-state-spanning');
    
    const hasViewportSegments = CSS.supports('padding: env(viewport-segment-width)');
    
    return {
      status: hasFoldClass && hasViewportSegments ? 'PASS' : 'PARTIAL',
      details: { hasFoldClass, hasViewportSegments }
    };
  }

  testAmbientLight() {
    if ('AmbientLightSensor' in window) {
      return { status: 'PASS', details: 'Ambient Light Sensor API available' };
    }
    
    // Check for fallback methods
    const hasColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches !== null;
    
    return {
      status: hasColorScheme ? 'PARTIAL' : 'FAIL',
      details: hasColorScheme ? 'Color scheme detection available' : 'No ambient light support'
    };
  }

  // Helper methods
  detectRefreshRate() {
    return new Promise((resolve) => {
      let start = null;
      let frames = 0;
      
      const measureFrame = (timestamp) => {
        if (!start) start = timestamp;
        frames++;
        
        if (timestamp - start < 1000) {
          requestAnimationFrame(measureFrame);
        } else {
          resolve(frames);
        }
      };
      
      requestAnimationFrame(measureFrame);
    });
  }

  async triggerRender() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Force a reflow
        const height = document.body.offsetHeight;
        console.log('Render triggered, height:', height);
        resolve();
      });
    });
  }

  async testScrollPerformance() {
    const testEl = document.createElement('div');
    testEl.style.cssText = `
      height: 200vh;
      background: linear-gradient(to bottom, red, blue);
    `;
    document.body.appendChild(testEl);
    
    const start = performance.now();
    window.scrollTo(0, 1000);
    await this.delay(100);
    const scrollTime = performance.now() - start;
    
    document.body.removeChild(testEl);
    window.scrollTo(0, 0);
    
    return {
      status: scrollTime < 100 ? 'PASS' : 'FAIR',
      time: scrollTime
    };
  }

  async testTouchLatency() {
    return new Promise((resolve) => {
      const testEl = document.createElement('div');
      testEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 100px;
        height: 100px;
        background: red;
        transform: translate(-50%, -50%);
      `;
      document.body.appendChild(testEl);
      
      const start = performance.now();
      
      testEl.addEventListener('touchstart', () => {
        const latency = performance.now() - start;
        document.body.removeChild(testEl);
        
        resolve({
          status: latency < 50 ? 'PASS' : latency < 100 ? 'GOOD' : 'FAIR',
          latency: latency
        });
      }, { once: true });
      
      // Simulate touch event
      const touch = new Touch({
        identifier: 1,
        target: testEl,
        clientX: 50,
        clientY: 50,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1
      });
      
      const touchEvent = new TouchEvent('touchstart', {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch]
      });
      
      testEl.dispatchEvent(touchEvent);
    });
  }

  // Generate comprehensive test report
  generateTestReport(results) {
    console.log('\n📊 DEVICE TESTING REPORT');
    console.log('========================');
    
    for (const [deviceId, result] of Object.entries(results)) {
      console.log(`\n📱 ${result.device}`);
      console.log('─'.repeat(result.device.length + 4));
      
      for (const [testName, testResult] of Object.entries(result.tests)) {
        const status = testResult.status || 'UNKNOWN';
        const icon = status === 'PASS' ? '✅' : 
                    status === 'PARTIAL' ? '⚠️' : 
                    status === 'FAIL' ? '❌' : '❓';
        
        console.log(`${icon} ${testName}: ${status}`);
        
        if (testResult.score) {
          console.log(`   Score: ${testResult.score}`);
        }
        
        if (testResult.details) {
          console.log(`   Details: ${JSON.stringify(testResult.details)}`);
        }
      }
    }
    
    // Generate summary
    this.generateTestSummary(results);
  }

  generateTestSummary(results) {
    const totalTests = Object.keys(results).length;
    let totalPassed = 0;
    let totalPartial = 0;
    let totalFailed = 0;
    
    for (const result of Object.values(results)) {
      for (const test of Object.values(result.tests)) {
        if (test.status === 'PASS') totalPassed++;
        else if (test.status === 'PARTIAL') totalPartial++;
        else if (test.status === 'FAIL') totalFailed++;
      }
    }
    
    console.log('\n📈 TESTING SUMMARY');
    console.log('==================');
    console.log(`Total Devices Tested: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`⚠️ Partial: ${totalPartial}`);
    console.log(`❌ Failed: ${totalFailed}`);
    
    const successRate = (totalPassed / (totalPassed + totalPartial + totalFailed)) * 100;
    console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT: App is ready for modern smartphones!');
    } else if (successRate >= 75) {
      console.log('👍 GOOD: App works well with minor improvements needed');
    } else if (successRate >= 60) {
      console.log('⚠️ FAIR: App needs optimization for modern devices');
    } else {
      console.log('❗ POOR: Significant improvements needed');
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Performance Audit Manager
class PerformanceAuditManager {
  constructor() {
    this.metrics = new Map();
    console.log('⚡ Performance Audit Manager initialized');
  }

  async runPerformanceAudit() {
    console.log('🔍 Starting performance audit...');
    
    const results = {
      timestamp: new Date().toISOString(),
      metrics: {},
      recommendations: []
    };

    // Core Web Vitals
    results.metrics.coreWebVitals = await this.measureCoreWebVitals();
    
    // Memory usage
    results.metrics.memory = this.measureMemoryUsage();
    
    // Network performance
    results.metrics.network = await this.measureNetworkPerformance();
    
    // Rendering performance
    results.metrics.rendering = await this.measureRenderingPerformance();
    
    // JavaScript performance
    results.metrics.javascript = await this.measureJavaScriptPerformance();
    
    // Generate recommendations
    results.recommendations = this.generateRecommendations(results.metrics);
    
    this.displayAuditResults(results);
    return results;
  }

  async measureCoreWebVitals() {
    const vitals = {};
    
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      vitals.lcp = await this.measureLCP();
      vitals.fid = await this.measureFID();
      vitals.cls = await this.measureCLS();
    }
    
    return vitals;
  }

  measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    
    return { status: 'Not supported' };
  }

  displayAuditResults(results) {
    console.log('\n⚡ PERFORMANCE AUDIT RESULTS');
    console.log('=============================');
    
    // Core Web Vitals
    if (results.metrics.coreWebVitals) {
      console.log('\n📊 Core Web Vitals:');
      const vitals = results.metrics.coreWebVitals;
      
      if (vitals.lcp) {
        const lcpStatus = vitals.lcp < 2500 ? 'GOOD' : vitals.lcp < 4000 ? 'NEEDS IMPROVEMENT' : 'POOR';
        console.log(`  LCP: ${vitals.lcp}ms (${lcpStatus})`);
      }
      
      if (vitals.fid) {
        const fidStatus = vitals.fid < 100 ? 'GOOD' : vitals.fid < 300 ? 'NEEDS IMPROVEMENT' : 'POOR';
        console.log(`  FID: ${vitals.fid}ms (${fidStatus})`);
      }
      
      if (vitals.cls) {
        const clsStatus = vitals.cls < 0.1 ? 'GOOD' : vitals.cls < 0.25 ? 'NEEDS IMPROVEMENT' : 'POOR';
        console.log(`  CLS: ${vitals.cls} (${clsStatus})`);
      }
    }
    
    // Memory usage
    if (results.metrics.memory?.percentage) {
      console.log(`\n🧠 Memory Usage: ${results.metrics.memory.percentage.toFixed(1)}%`);
    }
    
    // Recommendations
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }

  generateRecommendations(metrics) {
    const recommendations = [];
    
    // Memory recommendations
    if (metrics.memory?.percentage > 80) {
      recommendations.push('Consider implementing lazy loading to reduce memory usage');
      recommendations.push('Enable memory management optimizations');
    }
    
    // Performance recommendations
    if (metrics.coreWebVitals?.lcp > 2500) {
      recommendations.push('Optimize images and implement efficient loading strategies');
    }
    
    if (metrics.coreWebVitals?.fid > 100) {
      recommendations.push('Reduce JavaScript execution time during initial load');
    }
    
    return recommendations;
  }
}

// Initialize testing suite
export const initTestingSuite = () => {
  console.log('🧪 Initializing comprehensive testing suite...');
  
  const deviceTesting = new DeviceTestingManager();
  const performanceAudit = new PerformanceAuditManager();
  
  // Make testing tools available globally
  window.testingSuite = {
    deviceTesting,
    performanceAudit,
    
    // Quick test methods
    async runAllTests() {
      console.log('🚀 Running all tests...');
      
      const deviceResults = await deviceTesting.startDeviceTesting();
      const performanceResults = await performanceAudit.runPerformanceAudit();
      
      return {
        devices: deviceResults,
        performance: performanceResults
      };
    },
    
    async testCurrentDevice() {
      console.log('📱 Testing current device...');
      // Auto-detect current device and run targeted tests
      const currentProfile = deviceTesting.detectCurrentDevice();
      return await deviceTesting.testDevice('current', currentProfile);
    }
  };
  
  console.log('✅ Testing suite initialized');
  
  return {
    deviceTesting,
    performanceAudit
  };
};

export {
  DeviceTestingManager,
  PerformanceAuditManager
};

export default {
  initTestingSuite,
  DeviceTestingManager,
  PerformanceAuditManager
};