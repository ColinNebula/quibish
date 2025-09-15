/**
 * Adaptive UI and Display Manager
 * Dynamic interface adaptation for modern displays and devices
 * Supports: Foldable screens, dynamic island, adaptive brightness, ultra-wide displays
 */

// Foldable Screen Manager
class FoldableScreenManager {
  constructor() {
    this.isFoldable = this.detectFoldableDevice();
    this.foldState = 'unknown';
    this.screenSpanning = this.detectScreenSpanning();
    this.hinge = null;
    
    this.init();
  }

  // Detect if device is foldable
  detectFoldableDevice() {
    // Check for foldable screen APIs
    if ('screen' in window && 'isExtended' in window.screen) {
      return window.screen.isExtended;
    }
    
    // Check for CSS environment variables
    if (CSS.supports('(orientation: fold)')) {
      return true;
    }
    
    // Check for specific foldable device patterns
    const userAgent = navigator.userAgent.toLowerCase();
    const foldableDevices = [
      'galaxy fold', 'galaxy z fold', 'galaxy z flip',
      'surface duo', 'pixel fold', 'xiaomi mix fold',
      'huawei mate x', 'motorola razr'
    ];
    
    return foldableDevices.some(device => userAgent.includes(device));
  }

  // Detect screen spanning
  detectScreenSpanning() {
    if ('getScreenDetails' in window) {
      return this.getModernScreenDetails();
    }
    
    // Fallback detection
    const aspectRatio = window.innerWidth / window.innerHeight;
    return aspectRatio > 2.5 || aspectRatio < 0.4; // Unusual aspect ratios
  }

  async getModernScreenDetails() {
    try {
      const screenDetails = await window.getScreenDetails();
      return screenDetails.screens.length > 1;
    } catch (error) {
      console.warn('Screen Details API not available:', error);
      return false;
    }
  }

  init() {
    if (!this.isFoldable) {
      console.log('📱 Standard display detected');
      return;
    }
    
    console.log('📱 Foldable device detected');
    
    this.setupFoldStateMonitoring();
    this.setupScreenSpanningAPI();
    this.setupViewportSegmentation();
    this.applyFoldableOptimizations();
  }

  // Monitor fold state changes
  setupFoldStateMonitoring() {
    // CSS Media Query approach
    const foldQuery = window.matchMedia('(orientation: fold)');
    foldQuery.addListener((e) => {
      this.foldState = e.matches ? 'folded' : 'unfolded';
      this.handleFoldStateChange();
    });
    
    // Initial state
    this.foldState = foldQuery.matches ? 'folded' : 'unfolded';
    
    // Viewport changes that might indicate folding
    window.addEventListener('resize', () => {
      this.detectFoldFromResize();
    });
    
    // Orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.detectFoldFromOrientation(), 200);
    });
  }

  // Setup Screen Spanning API
  setupScreenSpanningAPI() {
    if ('screen' in window && 'onchange' in window.screen) {
      window.screen.addEventListener('change', () => {
        this.handleScreenSpanningChange();
      });
    }
  }

  // Setup Viewport Segmentation
  setupViewportSegmentation() {
    // CSS environment variables for viewport segments
    const segmentVars = [
      'viewport-segment-width', 'viewport-segment-height',
      'viewport-segment-top', 'viewport-segment-left',
      'viewport-segment-bottom', 'viewport-segment-right'
    ];
    
    segmentVars.forEach(varName => {
      if (CSS.supports(`padding: env(${varName} 0 0)`)) {
        console.log(`📐 Viewport segment support: ${varName}`);
      }
    });
  }

  // Detect fold state from resize events
  detectFoldFromResize() {
    const previousWidth = this.lastKnownWidth || window.innerWidth;
    const currentWidth = window.innerWidth;
    
    // Significant width change might indicate folding
    if (Math.abs(currentWidth - previousWidth) > 200) {
      this.foldState = currentWidth < previousWidth ? 'folded' : 'unfolded';
      this.handleFoldStateChange();
    }
    
    this.lastKnownWidth = currentWidth;
  }

  // Detect fold state from orientation
  detectFoldFromOrientation() {
    const orientation = window.screen?.orientation?.angle || window.orientation || 0;
    
    // Some foldables change orientation when folded
    if (orientation === 270 || orientation === 90) {
      const aspectRatio = window.innerWidth / window.innerHeight;
      
      if (aspectRatio > 2 || aspectRatio < 0.5) {
        this.foldState = 'spanning';
      } else {
        this.foldState = 'unfolded';
      }
    }
    
    this.handleFoldStateChange();
  }

  // Handle fold state changes
  handleFoldStateChange() {
    document.documentElement.className = document.documentElement.className
      .replace(/fold-state-\w+/g, '');
    
    document.documentElement.classList.add(`fold-state-${this.foldState}`);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('foldStateChange', {
      detail: { state: this.foldState, spanning: this.screenSpanning }
    }));
    
    console.log(`📱 Fold state changed: ${this.foldState}`);
    
    // Apply appropriate layout
    this.applyFoldStateLayout();
  }

  // Handle screen spanning changes
  handleScreenSpanningChange() {
    this.screenSpanning = this.detectScreenSpanning();
    
    document.documentElement.classList.toggle('screen-spanning', this.screenSpanning);
    
    window.dispatchEvent(new CustomEvent('screenSpanningChange', {
      detail: { spanning: this.screenSpanning }
    }));
  }

  // Apply layout for current fold state
  applyFoldStateLayout() {
    switch (this.foldState) {
      case 'folded':
        this.applyFoldedLayout();
        break;
      case 'unfolded':
        this.applyUnfoldedLayout();
        break;
      case 'spanning':
        this.applySpanningLayout();
        break;
    }
  }

  applyFoldedLayout() {
    // Compact layout for folded state
    document.documentElement.classList.add('compact-layout');
    document.documentElement.classList.remove('spanning-layout', 'expanded-layout');
  }

  applyUnfoldedLayout() {
    // Expanded layout for unfolded state
    document.documentElement.classList.add('expanded-layout');
    document.documentElement.classList.remove('compact-layout', 'spanning-layout');
  }

  applySpanningLayout() {
    // Dual-pane layout for spanning state
    document.documentElement.classList.add('spanning-layout');
    document.documentElement.classList.remove('compact-layout', 'expanded-layout');
  }

  applyFoldableOptimizations() {
    // Add foldable-specific CSS
    const style = document.createElement('style');
    style.textContent = `
      .fold-state-folded .main-content {
        max-width: 100%;
        padding: 8px;
      }
      
      .fold-state-spanning .main-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: env(viewport-segment-width, 20px);
      }
      
      .fold-state-unfolded .main-content {
        max-width: 1200px;
        margin: 0 auto;
      }
    `;
    document.head.appendChild(style);
  }
}

// Dynamic Island Manager (iPhone 14 Pro+)
class DynamicIslandManager {
  constructor() {
    this.hasDynamicIsland = this.detectDynamicIsland();
    this.islandState = 'minimal';
    this.activities = new Set();
    
    if (this.hasDynamicIsland) {
      this.init();
    }
  }

  // Detect Dynamic Island presence
  detectDynamicIsland() {
    // iPhone 14 Pro and newer detection
    const userAgent = navigator.userAgent;
    const isIPhone = /iPhone/i.test(userAgent);
    
    if (!isIPhone) return false;
    
    // Check screen dimensions for iPhone 14 Pro/Pro Max
    const screenHeight = Math.max(window.screen.height, window.screen.width);
    const screenWidth = Math.min(window.screen.height, window.screen.width);
    
    // iPhone 14 Pro: 393x852, iPhone 14 Pro Max: 430x932
    return (screenWidth === 393 && screenHeight === 852) ||
           (screenWidth === 430 && screenHeight === 932);
  }

  init() {
    console.log('🏝️ Dynamic Island detected');
    
    this.createDynamicIslandElement();
    this.setupIslandObserver();
    this.setupActivityManager();
    
    document.documentElement.classList.add('has-dynamic-island');
  }

  // Create virtual Dynamic Island element
  createDynamicIslandElement() {
    const island = document.createElement('div');
    island.className = 'dynamic-island';
    island.innerHTML = `
      <div class="island-content">
        <div class="island-leading"></div>
        <div class="island-center"></div>
        <div class="island-trailing"></div>
      </div>
    `;
    
    document.body.appendChild(island);
    this.islandElement = island;
  }

  // Setup observer for island interactions
  setupIslandObserver() {
    if (this.islandElement) {
      this.islandElement.addEventListener('click', () => {
        this.handleIslandInteraction();
      });
      
      this.islandElement.addEventListener('longpress', () => {
        this.expandIsland();
      });
    }
  }

  // Setup activity manager
  setupActivityManager() {
    // Monitor for activities that should appear in Dynamic Island
    this.monitorMediaPlayback();
    this.monitorCallState();
    this.monitorTimers();
    this.monitorNotifications();
  }

  // Monitor media playback
  monitorMediaPlayback() {
    document.addEventListener('play', (e) => {
      if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
        this.addActivity('media', {
          type: 'media',
          title: 'Playing',
          subtitle: e.target.src || 'Media',
          icon: '▶️'
        });
      }
    });
    
    document.addEventListener('pause', (e) => {
      if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
        this.removeActivity('media');
      }
    });
  }

  // Monitor call state
  monitorCallState() {
    window.addEventListener('callStateChange', (e) => {
      const { state, contact } = e.detail;
      
      if (state === 'active') {
        this.addActivity('call', {
          type: 'call',
          title: 'In Call',
          subtitle: contact?.name || 'Unknown',
          icon: '📞',
          color: '#34C759'
        });
      } else {
        this.removeActivity('call');
      }
    });
  }

  // Monitor timers
  monitorTimers() {
    window.addEventListener('timerStart', (e) => {
      const { duration, label } = e.detail;
      
      this.addActivity('timer', {
        type: 'timer',
        title: 'Timer',
        subtitle: label || 'Running',
        icon: '⏱️',
        duration: duration
      });
    });
    
    window.addEventListener('timerEnd', () => {
      this.removeActivity('timer');
    });
  }

  // Monitor notifications
  monitorNotifications() {
    window.addEventListener('notificationReceived', (e) => {
      const { title, body, icon } = e.detail;
      
      this.addActivity('notification', {
        type: 'notification',
        title: title,
        subtitle: body,
        icon: icon || '🔔',
        temporary: true
      });
      
      // Remove after 3 seconds
      setTimeout(() => {
        this.removeActivity('notification');
      }, 3000);
    });
  }

  // Add activity to Dynamic Island
  addActivity(id, activity) {
    this.activities.add({ id, ...activity });
    this.updateIslandContent();
    
    if (this.islandState === 'minimal') {
      this.expandIsland();
    }
  }

  // Remove activity from Dynamic Island
  removeActivity(id) {
    this.activities = new Set([...this.activities].filter(a => a.id !== id));
    this.updateIslandContent();
    
    if (this.activities.size === 0) {
      this.minimizeIsland();
    }
  }

  // Update island content
  updateIslandContent() {
    if (!this.islandElement) return;
    
    const leadingEl = this.islandElement.querySelector('.island-leading');
    const centerEl = this.islandElement.querySelector('.island-center');
    const trailingEl = this.islandElement.querySelector('.island-trailing');
    
    const activities = [...this.activities];
    
    if (activities.length === 0) {
      leadingEl.textContent = '';
      centerEl.textContent = '';
      trailingEl.textContent = '';
      return;
    }
    
    const primaryActivity = activities[0];
    
    leadingEl.textContent = primaryActivity.icon || '';
    centerEl.textContent = primaryActivity.title || '';
    trailingEl.textContent = activities.length > 1 ? `+${activities.length - 1}` : '';
  }

  // Expand Dynamic Island
  expandIsland() {
    if (this.islandState === 'expanded') return;
    
    this.islandState = 'expanded';
    this.islandElement?.classList.add('expanded');
    
    setTimeout(() => {
      this.minimizeIsland();
    }, 5000);
  }

  // Minimize Dynamic Island
  minimizeIsland() {
    this.islandState = 'minimal';
    this.islandElement?.classList.remove('expanded');
  }

  // Handle island interaction
  handleIslandInteraction() {
    if (this.activities.size > 0) {
      const primaryActivity = [...this.activities][0];
      
      // Dispatch activity interaction event
      window.dispatchEvent(new CustomEvent('dynamicIslandInteraction', {
        detail: { activity: primaryActivity }
      }));
    }
  }
}

// Adaptive Brightness Manager
class AdaptiveBrightnessManager {
  constructor() {
    this.isSupported = this.checkSupport();
    this.currentBrightness = 1.0;
    this.ambientLightLevel = 'normal';
    this.userPreference = this.getUserPreference();
    
    if (this.isSupported) {
      this.init();
    }
  }

  // Check for ambient light sensor support
  checkSupport() {
    return 'AmbientLightSensor' in window ||
           'DeviceLightEvent' in window ||
           matchMedia('(prefers-color-scheme: dark)').matches;
  }

  getUserPreference() {
    const saved = localStorage.getItem('adaptive-brightness-preference');
    return saved ? JSON.parse(saved) : { enabled: true, sensitivity: 'medium' };
  }

  init() {
    console.log('☀️ Adaptive brightness manager initialized');
    
    this.setupAmbientLightSensor();
    this.setupColorSchemeDetection();
    this.setupTimeBasedAdjustment();
  }

  // Setup ambient light sensor
  async setupAmbientLightSensor() {
    if (typeof window !== 'undefined' && 'AmbientLightSensor' in window) {
      try {
        const AmbientLightSensor = window.AmbientLightSensor;
        const sensor = new AmbientLightSensor({ frequency: 1 });
        
        sensor.addEventListener('reading', () => {
          this.handleAmbientLightChange(sensor.illuminance);
        });
        
        sensor.start();
        console.log('💡 Ambient light sensor active');
      } catch (error) {
        console.warn('Ambient light sensor not available:', error);
        this.fallbackLightDetection();
      }
    } else {
      this.fallbackLightDetection();
    }
  }

  // Fallback light detection
  fallbackLightDetection() {
    // Use color scheme preference as indicator
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleColorSchemeChange = (e) => {
      this.ambientLightLevel = e.matches ? 'low' : 'normal';
      this.adjustBrightness();
    };
    
    darkModeQuery.addListener(handleColorSchemeChange);
    handleColorSchemeChange(darkModeQuery);
  }

  // Setup color scheme detection
  setupColorSchemeDetection() {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const updateColorScheme = () => {
      if (darkQuery.matches) {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.remove('light-mode');
      } else if (lightQuery.matches) {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark-mode');
      }
    };
    
    darkQuery.addListener(updateColorScheme);
    lightQuery.addListener(updateColorScheme);
    updateColorScheme();
  }

  // Setup time-based brightness adjustment
  setupTimeBasedAdjustment() {
    const updateTimeBasedBrightness = () => {
      const hour = new Date().getHours();
      
      let timeLevel;
      if (hour >= 22 || hour <= 6) {
        timeLevel = 'night';
      } else if (hour >= 19 || hour <= 8) {
        timeLevel = 'evening';
      } else {
        timeLevel = 'day';
      }
      
      this.adjustBrightnessForTime(timeLevel);
    };
    
    // Update every hour
    setInterval(updateTimeBasedBrightness, 3600000);
    updateTimeBasedBrightness();
  }

  // Handle ambient light changes
  handleAmbientLightChange(illuminance) {
    let lightLevel;
    
    if (illuminance < 10) {
      lightLevel = 'very-low';
    } else if (illuminance < 50) {
      lightLevel = 'low';
    } else if (illuminance < 500) {
      lightLevel = 'normal';
    } else if (illuminance < 1000) {
      lightLevel = 'high';
    } else {
      lightLevel = 'very-high';
    }
    
    if (lightLevel !== this.ambientLightLevel) {
      this.ambientLightLevel = lightLevel;
      this.adjustBrightness();
    }
  }

  // Adjust brightness based on ambient light
  adjustBrightness() {
    if (!this.userPreference.enabled) return;
    
    let targetBrightness;
    
    switch (this.ambientLightLevel) {
      case 'very-low':
        targetBrightness = 0.3;
        break;
      case 'low':
        targetBrightness = 0.5;
        break;
      case 'normal':
        targetBrightness = 0.8;
        break;
      case 'high':
        targetBrightness = 1.0;
        break;
      case 'very-high':
        targetBrightness = 1.0;
        break;
      default:
        targetBrightness = 0.8;
    }
    
    this.setBrightness(targetBrightness);
  }

  // Adjust brightness for time of day
  adjustBrightnessForTime(timeLevel) {
    if (!this.userPreference.enabled) return;
    
    let adjustment = 1.0;
    
    switch (timeLevel) {
      case 'night':
        adjustment = 0.6;
        document.documentElement.classList.add('night-mode');
        break;
      case 'evening':
        adjustment = 0.8;
        document.documentElement.classList.remove('night-mode');
        break;
      case 'day':
        adjustment = 1.0;
        document.documentElement.classList.remove('night-mode');
        break;
    }
    
    this.setBrightness(this.currentBrightness * adjustment);
  }

  // Set brightness level
  setBrightness(level) {
    this.currentBrightness = Math.max(0.3, Math.min(1.0, level));
    
    // Apply brightness using CSS filter
    document.documentElement.style.filter = 
      `brightness(${this.currentBrightness})`;
    
    // Store current level
    document.documentElement.style.setProperty(
      '--adaptive-brightness', 
      this.currentBrightness.toString()
    );
    
    console.log(`☀️ Brightness adjusted: ${Math.round(this.currentBrightness * 100)}%`);
  }

  // Enable/disable adaptive brightness
  setEnabled(enabled) {
    this.userPreference.enabled = enabled;
    localStorage.setItem('adaptive-brightness-preference', 
      JSON.stringify(this.userPreference));
    
    if (!enabled) {
      this.setBrightness(1.0);
      document.documentElement.classList.remove('night-mode');
    } else {
      this.adjustBrightness();
    }
  }
}

// Ultra-wide Display Manager
class UltraWideDisplayManager {
  constructor() {
    this.isUltraWide = this.detectUltraWideDisplay();
    
    if (this.isUltraWide) {
      this.init();
    }
  }

  // Detect ultra-wide display
  detectUltraWideDisplay() {
    const aspectRatio = window.screen.width / window.screen.height;
    const viewportRatio = window.innerWidth / window.innerHeight;
    
    // Ultra-wide typically 21:9 or wider
    return aspectRatio >= 2.3 || viewportRatio >= 2.3;
  }

  init() {
    console.log('🖥️ Ultra-wide display detected');
    
    document.documentElement.classList.add('ultra-wide-display');
    this.setupUltraWideLayout();
    this.setupMultiColumnLayout();
  }

  setupUltraWideLayout() {
    const style = document.createElement('style');
    style.textContent = `
      .ultra-wide-display .main-container {
        max-width: 1600px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr 2fr 1fr;
        gap: 24px;
      }
      
      .ultra-wide-display .sidebar {
        position: relative;
        transform: none;
      }
      
      .ultra-wide-display .chat-container {
        grid-column: 2;
      }
      
      .ultra-wide-display .contacts-panel {
        grid-column: 3;
      }
    `;
    document.head.appendChild(style);
  }

  setupMultiColumnLayout() {
    // Enable multi-column layout for content areas
    const contentAreas = document.querySelectorAll('.content-area, .message-list');
    
    contentAreas.forEach(area => {
      if (area.scrollWidth > window.innerWidth * 0.6) {
        area.style.columnCount = '2';
        area.style.columnGap = '24px';
        area.style.columnRule = '1px solid rgba(0,0,0,0.1)';
      }
    });
  }
}

// Initialize all adaptive UI features
export const initAdaptiveUI = () => {
  console.log('🎨 Initializing adaptive UI features...');
  
  const foldableManager = new FoldableScreenManager();
  const dynamicIslandManager = new DynamicIslandManager();
  const brightnessManager = new AdaptiveBrightnessManager();
  const ultraWideManager = new UltraWideDisplayManager();
  
  // Make managers available globally
  window.adaptiveUI = {
    foldable: foldableManager,
    dynamicIsland: dynamicIslandManager,
    brightness: brightnessManager,
    ultraWide: ultraWideManager
  };
  
  console.log('✅ Adaptive UI features initialized');
  
  return {
    foldableManager,
    dynamicIslandManager,
    brightnessManager,
    ultraWideManager
  };
};

export {
  FoldableScreenManager,
  DynamicIslandManager,
  AdaptiveBrightnessManager,
  UltraWideDisplayManager
};

export default {
  initAdaptiveUI,
  FoldableScreenManager,
  DynamicIslandManager,
  AdaptiveBrightnessManager,
  UltraWideDisplayManager
};