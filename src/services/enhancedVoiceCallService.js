/**
 * Enhanced Voice Call Service
 * Handles phone number integration, WiFi optimization, and smart call routing
 */

import connectionService from './connectionService';

class EnhancedVoiceCallService {
  constructor() {
    this.activeCall = null;
    this.connectionMonitoringInterval = null;
    this.callQualityHistory = [];
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    return cleanNumber.length >= 10 && cleanNumber.length <= 15;
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Format US numbers
    if (cleanNumber.length === 10) {
      return `(${cleanNumber.slice(0, 3)}) ${cleanNumber.slice(3, 6)}-${cleanNumber.slice(6)}`;
    }
    
    // Format international numbers
    if (cleanNumber.length === 11 && cleanNumber[0] === '1') {
      return `+1 (${cleanNumber.slice(1, 4)}) ${cleanNumber.slice(4, 7)}-${cleanNumber.slice(7)}`;
    }
    
    // Default formatting for other lengths
    return `+${cleanNumber}`;
  }

  /**
   * Get available call methods for a user
   */
  async getAvailableCallMethods(targetUser) {
    const hasPhoneNumber = this.validatePhoneNumber(targetUser.phone);
    const connectionStatus = connectionService.getConnectionStatus();
    
    const methods = connectionService.getOptimalCallMethod(hasPhoneNumber);
    
    // Add user-specific information
    return methods.map(method => ({
      ...method,
      targetPhone: hasPhoneNumber ? this.formatPhoneNumber(targetUser.phone) : null,
      connectionQuality: connectionStatus.quality,
      estimatedLatency: connectionStatus.latency
    }));
  }

  /**
   * Initiate enhanced voice call with method selection
   */
  async initiateEnhancedCall(targetUser, preferredMethod = 'auto') {
    try {
      const availableMethods = await this.getAvailableCallMethods(targetUser);
      
      let selectedMethod;
      
      if (preferredMethod === 'auto') {
        // Auto-select best method
        selectedMethod = availableMethods[0];
      } else {
        // Use user-specified method
        selectedMethod = availableMethods.find(m => m.type === preferredMethod) || availableMethods[0];
      }

      const callData = {
        callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetUser,
        method: selectedMethod,
        startTime: new Date(),
        connectionStatus: connectionService.getConnectionStatus(),
        audioSettings: connectionService.getAudioSettings()
      };

      // Start the call based on selected method
      return await this.startCallWithMethod(callData);
      
    } catch (error) {
      console.error('Failed to initiate enhanced voice call:', error);
      throw error;
    }
  }

  /**
   * Start call with specific method
   */
  async startCallWithMethod(callData) {
    const { method, targetUser } = callData;
    
    switch (method.type) {
      case 'wifi-call':
        return await this.startWiFiOptimizedCall(callData);
      
      case 'webrtc':
        return await this.startWebRTCCall(callData);
      
      case 'webrtc-optimized':
        return await this.startOptimizedWebRTCCall(callData);
      
      case 'phone-call':
        return await this.startPhoneCall(callData);
      
      case 'callback-request':
        return await this.requestCallback(callData);
      
      default:
        throw new Error(`Unsupported call method: ${method.type}`);
    }
  }

  /**
   * Start WiFi-optimized call
   */
  async startWiFiOptimizedCall(callData) {
    console.log('🔊 Starting WiFi-optimized voice call...');
    
    // Enhanced audio settings for WiFi
    const audioConstraints = {
      audio: {
        ...callData.audioSettings,
        deviceId: 'default',
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    const callInstance = {
      ...callData,
      status: 'connecting',
      enhancedFeatures: {
        wifiOptimized: true,
        adaptiveQuality: true,
        backgroundNoiseReduction: true,
        dynamicBandwidthAdjustment: true
      }
    };

    this.activeCall = callInstance;
    this.startConnectionMonitoring();
    
    return callInstance;
  }

  /**
   * Start standard WebRTC call
   */
  async startWebRTCCall(callData) {
    console.log('🌐 Starting WebRTC voice call...');
    
    const callInstance = {
      ...callData,
      status: 'connecting',
      enhancedFeatures: {
        webrtcOptimized: true,
        echoCancellation: true
      }
    };

    this.activeCall = callInstance;
    this.startConnectionMonitoring();
    
    return callInstance;
  }

  /**
   * Start optimized WebRTC call for poor connections
   */
  async startOptimizedWebRTCCall(callData) {
    console.log('📞 Starting optimized voice call...');
    
    const callInstance = {
      ...callData,
      status: 'connecting',
      enhancedFeatures: {
        lowBandwidthMode: true,
        aggressiveCompression: true,
        reducedSampleRate: true
      }
    };

    this.activeCall = callInstance;
    this.startConnectionMonitoring();
    
    return callInstance;
  }

  /**
   * Start phone call (cellular fallback)
   */
  async startPhoneCall(callData) {
    console.log('📱 Initiating phone call...');
    
    const phoneNumber = callData.targetUser.phone;
    
    // In a real implementation, this would integrate with:
    // - Twilio Voice API
    // - WebRTC with PSTN gateway
    // - Native phone call intent
    
    const callInstance = {
      ...callData,
      status: 'dialing',
      phoneNumber: this.formatPhoneNumber(phoneNumber),
      enhancedFeatures: {
        cellularFallback: true,
        pstnGateway: true
      }
    };

    this.activeCall = callInstance;
    
    // Simulate phone call initiation
    setTimeout(() => {
      if (this.activeCall && this.activeCall.callId === callInstance.callId) {
        this.activeCall.status = 'ringing';
      }
    }, 1000);
    
    return callInstance;
  }

  /**
   * Request callback
   */
  async requestCallback(callData) {
    console.log('🔄 Requesting callback...');
    
    const callInstance = {
      ...callData,
      status: 'callback-requested',
      enhancedFeatures: {
        callbackRequest: true,
        offlineFallback: true
      }
    };

    // In real implementation, send callback request notification
    
    return callInstance;
  }

  /**
   * Start connection monitoring during call
   */
  startConnectionMonitoring() {
    this.connectionMonitoringInterval = connectionService.startCallMonitoring((qualityChange) => {
      if (this.activeCall) {
        this.handleQualityChange(qualityChange);
      }
    });
  }

  /**
   * Handle connection quality changes during call
   */
  handleQualityChange(qualityChange) {
    const { previousQuality, currentQuality, audioSettings } = qualityChange;
    
    console.log(`📶 Connection quality changed: ${previousQuality} → ${currentQuality}`);
    
    // Store quality history
    this.callQualityHistory.push({
      timestamp: new Date(),
      quality: currentQuality,
      latency: qualityChange.status.latency,
      bandwidth: qualityChange.status.bandwidth
    });

    // Update active call
    if (this.activeCall) {
      this.activeCall.connectionQuality = currentQuality;
      this.activeCall.audioSettings = audioSettings;
      
      // Trigger quality adaptation
      this.adaptCallQuality(currentQuality, audioSettings);
    }
  }

  /**
   * Adapt call quality based on connection changes
   */
  adaptCallQuality(quality, audioSettings) {
    if (!this.activeCall) return;

    switch (quality) {
      case 'excellent':
      case 'good':
        // Upgrade to high quality if possible
        if (this.activeCall.method.type !== 'wifi-call') {
          console.log('📈 Upgrading call quality...');
          // In real implementation: adjust audio bitrate, sample rate
        }
        break;
        
      case 'fair':
        console.log('⚖️ Maintaining stable quality...');
        // Maintain current settings
        break;
        
      case 'poor':
        console.log('📉 Reducing quality for stability...');
        // In real implementation: reduce bitrate, lower sample rate
        break;
        
      case 'offline':
        console.log('📵 Connection lost, attempting reconnection...');
        this.handleConnectionLoss();
        break;
    }
  }

  /**
   * Handle connection loss during call
   */
  handleConnectionLoss() {
    if (!this.activeCall) return;
    
    this.activeCall.status = 'reconnecting';
    
    // Attempt to reconnect or switch to phone fallback
    if (this.validatePhoneNumber(this.activeCall.targetUser.phone)) {
      console.log('📱 Switching to phone fallback...');
      // In real implementation: initiate phone call
    }
  }

  /**
   * End current call
   */
  endCall() {
    if (this.activeCall) {
      console.log('📞 Ending voice call...');
      
      // Stop connection monitoring
      if (this.connectionMonitoringInterval) {
        connectionService.stopCallMonitoring(this.connectionMonitoringInterval);
        this.connectionMonitoringInterval = null;
      }
      
      // Store call statistics
      const callDuration = new Date() - this.activeCall.startTime;
      const callStats = {
        duration: callDuration,
        qualityHistory: this.callQualityHistory,
        method: this.activeCall.method,
        finalQuality: this.activeCall.connectionQuality
      };
      
      console.log('📊 Call ended. Stats:', callStats);
      
      this.activeCall = null;
      this.callQualityHistory = [];
      
      return callStats;
    }
  }

  /**
   * Get current call status
   */
  getCurrentCallStatus() {
    if (!this.activeCall) return null;
    
    return {
      ...this.activeCall,
      duration: new Date() - this.activeCall.startTime,
      connectionStatus: connectionService.getConnectionStatus(),
      qualityHistory: this.callQualityHistory
    };
  }

  /**
   * Check if user has valid phone number
   */
  userHasPhoneNumber(user) {
    return this.validatePhoneNumber(user?.phone);
  }

  /**
   * Get connection recommendations for better call quality
   */
  getConnectionRecommendations() {
    const status = connectionService.getConnectionStatus();
    const recommendations = [];
    
    if (status.quality === 'poor' || status.quality === 'fair') {
      recommendations.push({
        type: 'wifi',
        icon: '📶',
        title: 'Connect to WiFi',
        description: 'Switch to a WiFi network for better call quality'
      });
      
      recommendations.push({
        type: 'location',
        icon: '📍',
        title: 'Move closer to router',
        description: 'Get closer to your WiFi router for stronger signal'
      });
    }
    
    if (status.latency > 200) {
      recommendations.push({
        type: 'network',
        icon: '🔄',
        title: 'Close other apps',
        description: 'Close bandwidth-heavy apps for better performance'
      });
    }
    
    return recommendations;
  }
}

// Create singleton instance
const enhancedVoiceCallService = new EnhancedVoiceCallService();

export default enhancedVoiceCallService;