/**
 * Connection Quality and Call Routing Service
 * Handles WiFi detection, connection quality assessment, and optimal call routing
 */

class ConnectionService {
  constructor() {
    this.connectionQuality = 'unknown';
    this.connectionType = 'unknown';
    this.bandwidth = 0;
    this.latency = 0;
    this.isOnline = navigator.onLine;
    this.wifiStrength = 0;
    
    // Initialize connection monitoring
    this.initializeConnectionMonitoring();
  }

  /**
   * Initialize connection monitoring and event listeners
   */
  initializeConnectionMonitoring() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.assessConnectionQuality();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.connectionQuality = 'offline';
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.updateConnectionInfo(connection);
        });
        this.updateConnectionInfo(connection);
      }
    }

    // Initial connection assessment
    this.assessConnectionQuality();
  }

  /**
   * Update connection information from Navigator API
   */
  updateConnectionInfo(connection) {
    this.connectionType = connection.effectiveType || connection.type || 'unknown';
    this.bandwidth = connection.downlink || 0;
    
    // Estimate WiFi strength based on connection type and bandwidth
    if (connection.type === 'wifi' || connection.effectiveType === '4g') {
      this.wifiStrength = this.calculateWiFiStrength(connection);
    }
    
    this.assessConnectionQuality();
  }

  /**
   * Calculate WiFi strength estimation
   */
  calculateWiFiStrength(connection) {
    if (!connection) return 0;
    
    const downlink = connection.downlink || 0;
    const rtt = connection.rtt || 0;
    
    // Calculate strength based on bandwidth and latency
    let strength = 0;
    
    if (downlink >= 10) strength += 40; // High bandwidth
    else if (downlink >= 5) strength += 30; // Medium bandwidth
    else if (downlink >= 1) strength += 20; // Low bandwidth
    
    if (rtt <= 50) strength += 30; // Low latency
    else if (rtt <= 100) strength += 20; // Medium latency
    else if (rtt <= 200) strength += 10; // High latency
    
    if (connection.effectiveType === '4g') strength += 30;
    else if (connection.effectiveType === '3g') strength += 20;
    else if (connection.effectiveType === 'slow-2g') strength += 5;
    
    return Math.min(100, strength);
  }

  /**
   * Assess overall connection quality
   */
  async assessConnectionQuality() {
    if (!this.isOnline) {
      this.connectionQuality = 'offline';
      return;
    }

    try {
      // Perform latency test
      const latency = await this.measureLatency();
      this.latency = latency;

      // Determine quality based on multiple factors
      if (this.connectionType === 'wifi' || this.connectionType === '4g') {
        if (latency < 50 && this.bandwidth > 5) {
          this.connectionQuality = 'excellent';
        } else if (latency < 100 && this.bandwidth > 2) {
          this.connectionQuality = 'good';
        } else if (latency < 200 && this.bandwidth > 1) {
          this.connectionQuality = 'fair';
        } else {
          this.connectionQuality = 'poor';
        }
      } else if (this.connectionType === '3g') {
        this.connectionQuality = latency < 150 ? 'fair' : 'poor';
      } else {
        this.connectionQuality = 'poor';
      }
    } catch (error) {
      console.warn('Connection quality assessment failed:', error);
      this.connectionQuality = 'unknown';
    }
  }

  /**
   * Measure network latency
   */
  async measureLatency() {
    const start = performance.now();
    
    try {
      // Use a small API call to measure latency
      await fetch('/api/ping', { 
        method: 'GET',
        cache: 'no-cache'
      });
      
      const end = performance.now();
      return end - start;
    } catch (error) {
      // Fallback latency measurement
      return 200; // Default to 200ms if ping fails
    }
  }

  /**
   * Get optimal call method based on connection quality and available options
   */
  getOptimalCallMethod(hasPhoneNumber = false, userPreferences = {}) {
    const quality = this.connectionQuality;
    const isWiFi = this.connectionType === 'wifi';
    
    // Call method priorities based on connection quality
    const methods = [];
    
    if (quality === 'excellent' || quality === 'good') {
      if (isWiFi) {
        methods.push({
          type: 'wifi-call',
          quality: 'high',
          description: 'WiFi Voice Call (HD)',
          icon: '📶',
          estimated_quality: '🔊🔊🔊',
          latency: this.latency,
          bandwidth: this.bandwidth
        });
      }
      
      methods.push({
        type: 'webrtc',
        quality: 'high',
        description: 'Internet Call (HD)',
        icon: '🌐',
        estimated_quality: '🔊🔊🔊'
      });
    }
    
    if (quality === 'fair' || methods.length === 0) {
      methods.push({
        type: 'webrtc-optimized',
        quality: 'medium',
        description: 'Optimized Internet Call',
        icon: '📞',
        estimated_quality: '🔊🔊'
      });
    }
    
    // Add phone fallback if available
    if (hasPhoneNumber) {
      methods.push({
        type: 'phone-call',
        quality: 'standard',
        description: 'Phone Call',
        icon: '📱',
        estimated_quality: '🔊🔊',
        note: 'Uses cellular network'
      });
    }
    
    // Add emergency fallback
    if (quality === 'poor' || quality === 'offline') {
      methods.push({
        type: 'callback-request',
        quality: 'fallback',
        description: 'Request Callback',
        icon: '🔄',
        estimated_quality: '📞',
        note: 'User will call you back'
      });
    }
    
    return methods;
  }

  /**
   * Get connection status for UI display
   */
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      quality: this.connectionQuality,
      type: this.connectionType,
      bandwidth: this.bandwidth,
      latency: this.latency,
      wifiStrength: this.wifiStrength,
      icon: this.getConnectionIcon(),
      color: this.getConnectionColor()
    };
  }

  /**
   * Get connection icon based on quality
   */
  getConnectionIcon() {
    switch (this.connectionQuality) {
      case 'excellent': return '📶';
      case 'good': return '📶';
      case 'fair': return '📶';
      case 'poor': return '📶';
      case 'offline': return '📵';
      default: return '❓';
    }
  }

  /**
   * Get connection color for UI
   */
  getConnectionColor() {
    switch (this.connectionQuality) {
      case 'excellent': return '#10b981'; // Green
      case 'good': return '#059669'; // Green
      case 'fair': return '#f59e0b'; // Yellow
      case 'poor': return '#ef4444'; // Red
      case 'offline': return '#6b7280'; // Gray
      default: return '#6b7280'; // Gray
    }
  }

  /**
   * Optimize audio settings based on connection quality
   */
  getAudioSettings() {
    const quality = this.connectionQuality;
    
    switch (quality) {
      case 'excellent':
        return {
          sampleRate: 48000,
          bitrate: 128,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          highpassFilter: false
        };
      
      case 'good':
        return {
          sampleRate: 44100,
          bitrate: 96,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          highpassFilter: true
        };
      
      case 'fair':
        return {
          sampleRate: 22050,
          bitrate: 64,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          highpassFilter: true
        };
      
      case 'poor':
      default:
        return {
          sampleRate: 16000,
          bitrate: 32,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          highpassFilter: true
        };
    }
  }

  /**
   * Monitor connection during active call
   */
  startCallMonitoring(onQualityChange) {
    const interval = setInterval(async () => {
      const previousQuality = this.connectionQuality;
      await this.assessConnectionQuality();
      
      if (previousQuality !== this.connectionQuality) {
        onQualityChange({
          previousQuality,
          currentQuality: this.connectionQuality,
          status: this.getConnectionStatus(),
          audioSettings: this.getAudioSettings()
        });
      }
    }, 5000); // Check every 5 seconds

    return interval; // Return interval ID to clear later
  }

  /**
   * Stop connection monitoring
   */
  stopCallMonitoring(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

// Create singleton instance
const connectionService = new ConnectionService();

export default connectionService;