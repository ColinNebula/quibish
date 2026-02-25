// Native Device Features Service - Complete Implementation
class NativeDeviceFeaturesService {
  constructor() {
    this.features = {
      camera: false,
      microphone: false,
      geolocation: false,
      notifications: false,
      vibration: false,
      deviceMotion: false,
      touchSupport: false,
      fullscreen: false
    };
    this.permissions = {};
    this.isInitialized = false;
  }

  // Initialize and detect all device features
  async initialize() {
    try {
      await this.detectFeatures();
      await this.checkPermissions();
      
      this.isInitialized = true;
      
      return {
        success: true,
        features: this.features,
        permissions: this.permissions
      };
    } catch (error) {
      console.error('Failed to initialize device features:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Detect available device features
  async detectFeatures() {
    // Camera and Microphone
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.features.camera = devices.some(device => device.kind === 'videoinput');
        this.features.microphone = devices.some(device => device.kind === 'audioinput');
      } catch (error) {
        console.warn('Could not enumerate devices:', error);
        // Set features to false if enumeration fails
        this.features.camera = false;
        this.features.microphone = false;
      }
    }
    
    // Geolocation
    this.features.geolocation = 'geolocation' in navigator;
    
    // Notifications
    this.features.notifications = 'Notification' in window;
    
    // Vibration
    this.features.vibration = 'vibrate' in navigator;
    
    // Device Motion
    this.features.deviceMotion = 'DeviceMotionEvent' in window;
    
    // Touch Support
    this.features.touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Fullscreen API
    this.features.fullscreen = !!(document.fullscreenEnabled || 
                                 document.webkitFullscreenEnabled || 
                                 document.mozFullScreenEnabled);
  }

  // Check permissions for available features
  async checkPermissions() {
    if ('permissions' in navigator) {
      const permissionsToCheck = [
        'camera',
        'microphone',
        'geolocation',
        'notifications'
      ];
      
      for (const permission of permissionsToCheck) {
        try {
          const result = await navigator.permissions.query({ name: permission });
          this.permissions[permission] = result.state;
        } catch (error) {
          this.permissions[permission] = 'unknown';
        }
      }
    }
  }

  // Get available features
  getFeatures() {
    return {
      ...this.features,
      permissions: this.permissions,
      initialized: this.isInitialized
    };
  }

  // Request camera access
  async requestCamera(constraints = { video: true }) {
    if (!this.features.camera) {
      console.warn('📹 Camera feature not available');
      return { success: false, error: 'Camera not available' };
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return {
        success: true,
        stream,
        deviceId: stream.getVideoTracks()[0]?.getSettings().deviceId
      };
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      
      let userMessage = error.message;
      if (error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Camera is already in use by another application.';
      }
      
      return {
        success: false,
        error: userMessage,
        name: error.name,
        originalMessage: error.message
      };
    }
  }

  // Request microphone access
  async requestMicrophone(constraints = { audio: true }) {
    if (!this.features.microphone) {
      console.warn('🎤 Microphone feature not available');
      return { success: false, error: 'Microphone not available' };
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return {
        success: true,
        stream,
        deviceId: stream.getAudioTracks()[0]?.getSettings().deviceId
      };
    } catch (error) {
      console.error('❌ Microphone access failed:', error);
      
      let userMessage = error.message;
      if (error.name === 'NotFoundError') {
        userMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotAllowedError') {
        userMessage = 'Microphone permission denied. Please allow microphone access in browser settings.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Microphone is already in use by another application.';
      }
      
      return {
        success: false,
        error: userMessage,
        name: error.name,
        originalMessage: error.message
      };
    }
  }

  // Request geolocation
  async requestGeolocation(options = {}) {
    if (!this.features.geolocation) {
      return { success: false, error: 'Geolocation not available' };
    }
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            success: true,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            timestamp: position.timestamp
          });
        },
        (error) => {
          resolve({
            success: false,
            error: error.message,
            code: error.code
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
          ...options
        }
      );
    });
  }

  // Request notification permission
  async requestNotifications() {
    if (!this.features.notifications) {
      return { success: false, error: 'Notifications not available' };
    }
    
    try {
      const permission = await Notification.requestPermission();
      this.permissions.notifications = permission;
      
      return {
        success: permission === 'granted',
        permission
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send notification
  sendNotification(title, options = {}) {
    if (!this.features.notifications || this.permissions.notifications !== 'granted') {
      return { success: false, error: 'Notification permission not granted' };
    }
    
    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });
      
      return {
        success: true,
        notification
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Vibrate device
  vibrate(pattern = [200, 100, 200]) {
    if (!this.features.vibration) {
      return { success: false, error: 'Vibration not available' };
    }
    
    try {
      navigator.vibrate(pattern);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enter fullscreen
  async enterFullscreen(element = document.documentElement) {
    if (!this.features.fullscreen) {
      return { success: false, error: 'Fullscreen not available' };
    }
    
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Exit fullscreen
  async exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Listen for device motion
  startDeviceMotionListening(callback) {
    if (!this.features.deviceMotion) {
      return { success: false, error: 'Device motion not available' };
    }
    
    const handleMotion = (event) => {
      callback({
        acceleration: event.acceleration,
        accelerationIncludingGravity: event.accelerationIncludingGravity,
        rotationRate: event.rotationRate,
        interval: event.interval
      });
    };
    
    window.addEventListener('devicemotion', handleMotion);
    
    return {
      success: true,
      stop: () => window.removeEventListener('devicemotion', handleMotion)
    };
  }

  // Check if a specific feature is supported
  isSupported(featureName) {
    // Handle different feature name mappings
    const featureMap = {
      'camera': 'camera',
      'microphone': 'microphone',
      'geolocation': 'geolocation',
      'notifications': 'notifications',
      'vibration': 'vibration',
      'deviceMotion': 'deviceMotion',
      'motion': 'deviceMotion',
      'touch': 'touchSupport',
      'touchSupport': 'touchSupport',
      'fullscreen': 'fullscreen',
      'contacts': false // Contacts API is not widely supported yet
    };

    // Map the feature name
    const mappedFeature = featureMap[featureName];
    
    // Return false for unsupported features like contacts
    if (mappedFeature === false) {
      return false;
    }
    
    // Return the feature availability if mapped
    if (mappedFeature && this.features.hasOwnProperty(mappedFeature)) {
      return this.features[mappedFeature];
    }
    
    // Fallback: return false for unknown features
    return false;
  }

  // Get all supported features
  getSupportedFeatures() {
    return Object.keys(this.features).filter(feature => this.features[feature]);
  }

  // Get feature availability status
  getFeatureStatus(featureName) {
    const isSupported = this.isSupported(featureName);
    const permission = this.permissions[featureName] || 'unknown';
    
    return {
      supported: isSupported,
      permission: permission,
      available: isSupported && permission !== 'denied'
    };
  }
}

export default new NativeDeviceFeaturesService();