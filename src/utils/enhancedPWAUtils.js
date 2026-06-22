/**
 * Enhanced PWA Utilities
 * Comprehensive PWA feature detection and management
 */

class EnhancedPWAUtils {
  constructor() {
    this.isStandalone = this.checkStandalone();
    this.isIOS = this.checkIOS();
    this.isAndroid = this.checkAndroid();
    this.capabilities = this.detectCapabilities();
  }

  // ========== INSTALLATION ==========

  /**
   * Check if app is running in standalone mode (installed)
   */
  checkStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Check if device is iOS
   */
  checkIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * Check if device is Android
   */
  checkAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  /**
   * Check if app can be installed
   */
  canInstall() {
    return 'BeforeInstallPromptEvent' in window;
  }

  /**
   * Get install instructions for current platform
   */
  getInstallInstructions() {
    if (this.isStandalone) {
      return {
        installed: true,
        message: 'App is already installed!'
      };
    }

    if (this.isIOS) {
      return {
        platform: 'iOS',
        steps: [
          'Tap the Share button 📤',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right corner',
          'The app will appear on your home screen'
        ]
      };
    }

    if (this.isAndroid) {
      return {
        platform: 'Android',
        steps: [
          'Tap the menu button (⋮)',
          'Tap "Add to Home screen" or "Install app"',
          'Tap "Add" or "Install"',
          'The app will appear on your home screen'
        ]
      };
    }

    return {
      platform: 'Desktop',
      steps: [
        'Look for the install icon in your browser\'s address bar',
        'Click it to install Quibish',
        'Or use the install button in the app'
      ]
    };
  }

  // ========== CAPABILITIES ==========

  /**
   * Detect all PWA capabilities
   */
  detectCapabilities() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window && 'Notification' in window,
      backgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
      periodicBackgroundSync: 'periodicSync' in ServiceWorkerRegistration.prototype,
      shareAPI: 'share' in navigator,
      fileSystemAccess: 'showOpenFilePicker' in window,
      badging: 'setAppBadge' in navigator,
      webShare: 'share' in navigator && 'canShare' in navigator,
      clipboard: 'clipboard' in navigator,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      offlineStorage: 'indexedDB' in window && 'localStorage' in window,
      cacheAPI: 'caches' in window,
      webRTC: 'RTCPeerConnection' in window,
      installable: 'BeforeInstallPromptEvent' in window,
      standalone: this.isStandalone
    };
  }

  /**
   * Get capabilities report
   */
  getCapabilitiesReport() {
    const caps = this.capabilities;
    return {
      score: Object.values(caps).filter(Boolean).length,
      total: Object.keys(caps).length,
      percentage: Math.round((Object.values(caps).filter(Boolean).length / Object.keys(caps).length) * 100),
      capabilities: caps,
      missing: Object.entries(caps).filter(([, value]) => !value).map(([key]) => key)
    };
  }

  // ========== NOTIFICATIONS ==========

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!this.capabilities.pushNotifications) {
      return { granted: false, reason: 'not-supported' };
    }

    if (Notification.permission === 'granted') {
      return { granted: true, permission: 'granted' };
    }

    if (Notification.permission === 'denied') {
      return { granted: false, permission: 'denied' };
    }

    try {
      const permission = await Notification.requestPermission();
      return {
        granted: permission === 'granted',
        permission
      };
    } catch (error) {
      return {
        granted: false,
        error: error.message
      };
    }
  }

  /**
   * Show local notification
   */
  async showNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
      const result = await this.requestNotificationPermission();
      if (!result.granted) {
        return { success: false, reason: 'permission-denied' };
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/quibish/logo192.png',
        badge: '/quibish/logo192.png',
        vibrate: [100, 50, 100],
        ...options
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== APP BADGE ==========

  /**
   * Set app badge (unread count)
   */
  async setAppBadge(count) {
    if (!this.capabilities.badging) {
      return { success: false, reason: 'not-supported' };
    }

    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear app badge
   */
  async clearAppBadge() {
    if (!this.capabilities.badging) {
      return { success: false, reason: 'not-supported' };
    }

    try {
      await navigator.clearAppBadge();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========== WEB SHARE ==========

  /**
   * Share content using Web Share API
   */
  async share(data) {
    if (!this.capabilities.webShare) {
      return { success: false, reason: 'not-supported' };
    }

    try {
      if (navigator.canShare && !navigator.canShare(data)) {
        return { success: false, reason: 'cannot-share' };
      }

      await navigator.share(data);
      return { success: true };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, reason: 'user-cancelled' };
      }
      return { success: false, error: error.message };
    }
  }

  // ========== OFFLINE STORAGE ==========

  /**
   * Check storage quota
   */
  async checkStorageQuota() {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return { supported: false };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        supported: true,
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100),
        available: estimate.quota - estimate.usage
      };
    } catch (error) {
      return { supported: false, error: error.message };
    }
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage() {
    if (!('storage' in navigator && 'persist' in navigator.storage)) {
      return { granted: false, reason: 'not-supported' };
    }

    try {
      const granted = await navigator.storage.persist();
      return { granted };
    } catch (error) {
      return { granted: false, error: error.message };
    }
  }

  // ========== DISPLAY MODE ==========

  /**
   * Get current display mode
   */
  getDisplayMode() {
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    return 'browser';
  }

  /**
   * Listen for display mode changes
   */
  onDisplayModeChange(callback) {
    const modes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    
    modes.forEach(mode => {
      const mediaQuery = window.matchMedia(`(display-mode: ${mode})`);
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          callback(mode);
        }
      });
    });
  }

  // ========== NETWORK STATUS ==========

  /**
   * Get network information
   */
  getNetworkInfo() {
    if (!('connection' in navigator)) {
      return { supported: false };
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      supported: true,
      online: navigator.onLine,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  /**
   * Check if connection is good
   */
  hasGoodConnection() {
    if (!navigator.onLine) return false;
    
    const network = this.getNetworkInfo();
    if (!network.supported) return navigator.onLine;
    
    // Consider 4g and 3g as good connections
    return ['4g', '3g'].includes(network.effectiveType);
  }

  // ========== LIFECYCLE ==========

  /**
   * Add to home screen prompt (iOS)
   */
  showIOSInstallPrompt() {
    if (!this.isIOS || this.isStandalone) {
      return false;
    }

    // Show custom prompt for iOS
    const instructions = this.getInstallInstructions();
    return instructions;
  }

  /**
   * Get PWA status summary
   */
  getStatus() {
    return {
      installed: this.isStandalone,
      installable: this.canInstall(),
      platform: this.isIOS ? 'iOS' : this.isAndroid ? 'Android' : 'Desktop',
      displayMode: this.getDisplayMode(),
      capabilities: this.getCapabilitiesReport(),
      network: this.getNetworkInfo(),
      online: navigator.onLine
    };
  }

  /**
   * Log PWA status to console
   */
  logStatus() {
    const status = this.getStatus();
    console.group('📱 PWA Status');
    console.log('Installed:', status.installed);
    console.log('Installable:', status.installable);
    console.log('Platform:', status.platform);
    console.log('Display Mode:', status.displayMode);
    console.log('Capabilities:', `${status.capabilities.score}/${status.capabilities.total} (${status.capabilities.percentage}%)`);
    console.log('Online:', status.online);
    if (status.capabilities.missing.length > 0) {
      console.warn('Missing capabilities:', status.capabilities.missing);
    }
    console.groupEnd();
    return status;
  }
}

export default new EnhancedPWAUtils();
