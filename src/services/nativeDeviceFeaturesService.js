/**
 * Native Device Features Service
 * Provides access to smartphone native features like camera, contacts, sensors, etc.
 */

class NativeDeviceFeaturesService {
  constructor() {
    this.capabilities = {
      camera: false,
      microphone: false,
      geolocation: false,
      contacts: false,
      sensors: false,
      fileSystem: false,
      webShare: false,
      notifications: false,
      vibration: false,
      fullscreen: false,
      orientation: false
    };
    
    this.sensors = {
      accelerometer: null,
      gyroscope: null,
      magnetometer: null,
      orientationSensor: null
    };
    
    this.init();
  }

  async init() {
    await this.detectCapabilities();
    this.setupSensors();
    console.log('✅ Native Device Features Service initialized', this.capabilities);
  }

  // Detect device capabilities
  async detectCapabilities() {
    // Camera and microphone
    this.capabilities.camera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    this.capabilities.microphone = this.capabilities.camera;
    
    // Geolocation
    this.capabilities.geolocation = 'geolocation' in navigator;
    
    // Contact Picker API
    this.capabilities.contacts = 'contacts' in navigator;
    
    // Generic Sensor API
    this.capabilities.sensors = 'Accelerometer' in window || 'Gyroscope' in window;
    
    // File System Access API
    this.capabilities.fileSystem = 'showOpenFilePicker' in window;
    
    // Web Share API
    this.capabilities.webShare = 'share' in navigator;
    
    // Notifications
    this.capabilities.notifications = 'Notification' in window;
    
    // Vibration
    this.capabilities.vibration = 'vibrate' in navigator;
    
    // Fullscreen
    this.capabilities.fullscreen = 'requestFullscreen' in document.documentElement;
    
    // Screen Orientation
    this.capabilities.orientation = 'orientation' in window.screen;
  }

  // Camera Access
  async requestCameraAccess(constraints = {}) {
    if (!this.capabilities.camera) {
      throw new Error('Camera not supported');
    }

    const defaultConstraints = {
      video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user' // 'user' for front camera, 'environment' for back camera
      },
      audio: false
    };

    const finalConstraints = { ...defaultConstraints, ...constraints };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      console.log('✅ Camera access granted');
      return stream;
    } catch (error) {
      console.error('❌ Camera access denied:', error);
      throw error;
    }
  }

  // Capture photo from camera
  async capturePhoto(facingMode = 'user') {
    try {
      const stream = await this.requestCameraAccess({
        video: { facingMode }
      });

      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Capture frame
          context.drawImage(video, 0, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            // Stop camera stream
            stream.getTracks().forEach(track => track.stop());
            
            if (blob) {
              resolve({
                blob,
                dataUrl: canvas.toDataURL('image/jpeg', 0.9),
                width: canvas.width,
                height: canvas.height
              });
            } else {
              reject(new Error('Failed to capture photo'));
            }
          }, 'image/jpeg', 0.9);
        };

        video.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop());
          reject(error);
        };
      });
    } catch (error) {
      console.error('❌ Photo capture failed:', error);
      throw error;
    }
  }

  // Record video
  async recordVideo(duration = 30000) {
    try {
      const stream = await this.requestCameraAccess({
        video: true,
        audio: true
      });

      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          resolve({
            blob,
            url: URL.createObjectURL(blob),
            duration: duration
          });
        };

        mediaRecorder.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop());
          reject(error);
        };

        mediaRecorder.start();
        
        // Auto-stop after duration
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, duration);
      });
    } catch (error) {
      console.error('❌ Video recording failed:', error);
      throw error;
    }
  }

  // Contact Picker
  async pickContacts(options = {}) {
    if (!this.capabilities.contacts) {
      throw new Error('Contact Picker not supported');
    }

    const defaultOptions = {
      multiple: false,
      properties: ['name', 'email', 'tel']
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const contacts = await navigator.contacts.select(finalOptions.properties, {
        multiple: finalOptions.multiple
      });
      
      console.log('✅ Contacts selected:', contacts);
      return contacts;
    } catch (error) {
      console.error('❌ Contact selection failed:', error);
      throw error;
    }
  }

  // Geolocation
  async getCurrentLocation(options = {}) {
    if (!this.capabilities.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', position);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp
          });
        },
        (error) => {
          console.error('❌ Location access failed:', error);
          reject(error);
        },
        finalOptions
      );
    });
  }

  // Watch location changes
  watchLocation(callback, options = {}) {
    if (!this.capabilities.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    const finalOptions = { ...defaultOptions, ...options };

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: position.timestamp
        });
      },
      (error) => {
        console.error('❌ Location watch failed:', error);
        callback(null, error);
      },
      finalOptions
    );
  }

  // Setup device sensors
  setupSensors() {
    if (!this.capabilities.sensors) {
      console.log('📱 Device sensors not available');
      return;
    }

    try {
      // Accelerometer
      if ('Accelerometer' in window) {
        this.sensors.accelerometer = new window.Accelerometer({ frequency: 60 });
        this.sensors.accelerometer.addEventListener('reading', () => {
          this.handleSensorReading('accelerometer', {
            x: this.sensors.accelerometer.x,
            y: this.sensors.accelerometer.y,
            z: this.sensors.accelerometer.z
          });
        });
      }

      // Gyroscope
      if ('Gyroscope' in window) {
        this.sensors.gyroscope = new window.Gyroscope({ frequency: 60 });
        this.sensors.gyroscope.addEventListener('reading', () => {
          this.handleSensorReading('gyroscope', {
            x: this.sensors.gyroscope.x,
            y: this.sensors.gyroscope.y,
            z: this.sensors.gyroscope.z
          });
        });
      }

      // Orientation (fallback)
      if ('DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientation', (event) => {
          this.handleSensorReading('orientation', {
            alpha: event.alpha, // Z axis
            beta: event.beta,   // X axis
            gamma: event.gamma  // Y axis
          });
        });
      }

      console.log('✅ Device sensors initialized');
    } catch (error) {
      console.error('❌ Sensor setup failed:', error);
    }
  }

  // Handle sensor readings
  handleSensorReading(sensorType, data) {
    // Emit custom event for sensor data
    const event = new CustomEvent('device-sensor', {
      detail: {
        type: sensorType,
        data: data,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  // File System Access
  async openFileDialog(options = {}) {
    if (!this.capabilities.fileSystem) {
      // Fallback to traditional file input
      return this.fallbackFileDialog(options);
    }

    const defaultOptions = {
      multiple: false,
      types: [
        {
          description: 'Images',
          accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }
        },
        {
          description: 'Videos',
          accept: { 'video/*': ['.mp4', '.webm', '.ogg'] }
        },
        {
          description: 'Documents',
          accept: { 'application/pdf': ['.pdf'], 'text/*': ['.txt', '.md'] }
        }
      ]
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const fileHandles = await window.showOpenFilePicker(finalOptions);
      const files = await Promise.all(
        fileHandles.map(async (handle) => {
          const file = await handle.getFile();
          return { file, handle };
        })
      );
      
      console.log('✅ Files selected via File System API:', files);
      return files;
    } catch (error) {
      console.error('❌ File selection failed:', error);
      throw error;
    }
  }

  // Fallback file dialog
  fallbackFileDialog(options = {}) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple || false;
      
      // Set accept attribute based on types
      if (options.types) {
        const accepts = options.types.flatMap(type => 
          Object.values(type.accept).flat()
        );
        input.accept = accepts.join(',');
      }

      input.onchange = (event) => {
        const files = Array.from(event.target.files).map(file => ({ file }));
        resolve(files);
      };

      input.onerror = reject;
      input.click();
    });
  }

  // Web Share API
  async shareContent(data) {
    if (!this.capabilities.webShare) {
      throw new Error('Web Share not supported');
    }

    try {
      await navigator.share(data);
      console.log('✅ Content shared successfully');
      return true;
    } catch (error) {
      console.error('❌ Sharing failed:', error);
      throw error;
    }
  }

  // Share file
  async shareFile(file, data = {}) {
    if (!this.capabilities.webShare) {
      throw new Error('Web Share not supported');
    }

    try {
      const shareData = {
        files: [file],
        ...data
      };

      if (navigator.canShare && !navigator.canShare(shareData)) {
        throw new Error('Cannot share this file type');
      }

      await navigator.share(shareData);
      console.log('✅ File shared successfully');
      return true;
    } catch (error) {
      console.error('❌ File sharing failed:', error);
      throw error;
    }
  }

  // Screen Orientation
  async lockOrientation(orientation) {
    if (!this.capabilities.orientation) {
      throw new Error('Screen Orientation not supported');
    }

    try {
      await window.screen.orientation.lock(orientation);
      console.log(`✅ Orientation locked to ${orientation}`);
    } catch (error) {
      console.error('❌ Orientation lock failed:', error);
      throw error;
    }
  }

  unlockOrientation() {
    if (this.capabilities.orientation) {
      window.screen.orientation.unlock();
      console.log('✅ Orientation unlocked');
    }
  }

  // Fullscreen API
  async enterFullscreen(element = document.documentElement) {
    if (!this.capabilities.fullscreen) {
      throw new Error('Fullscreen not supported');
    }

    try {
      await element.requestFullscreen();
      console.log('✅ Entered fullscreen');
    } catch (error) {
      console.error('❌ Fullscreen failed:', error);
      throw error;
    }
  }

  exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      console.log('✅ Exited fullscreen');
    }
  }

  // Get device capabilities
  getCapabilities() {
    return { ...this.capabilities };
  }

  // Check if feature is supported
  isSupported(feature) {
    return this.capabilities[feature] || false;
  }
}

// Create global instance
const nativeDeviceFeaturesService = new NativeDeviceFeaturesService();

// Export utility functions
export const deviceUtils = {
  // Camera functions
  capturePhoto: (facingMode) => nativeDeviceFeaturesService.capturePhoto(facingMode),
  recordVideo: (duration) => nativeDeviceFeaturesService.recordVideo(duration),
  
  // Contact functions
  pickContacts: (options) => nativeDeviceFeaturesService.pickContacts(options),
  
  // Location functions
  getLocation: (options) => nativeDeviceFeaturesService.getCurrentLocation(options),
  watchLocation: (callback, options) => nativeDeviceFeaturesService.watchLocation(callback, options),
  
  // File functions
  openFiles: (options) => nativeDeviceFeaturesService.openFileDialog(options),
  
  // Share functions
  share: (data) => nativeDeviceFeaturesService.shareContent(data),
  shareFile: (file, data) => nativeDeviceFeaturesService.shareFile(file, data),
  
  // Screen functions
  lockOrientation: (orientation) => nativeDeviceFeaturesService.lockOrientation(orientation),
  unlockOrientation: () => nativeDeviceFeaturesService.unlockOrientation(),
  enterFullscreen: (element) => nativeDeviceFeaturesService.enterFullscreen(element),
  exitFullscreen: () => nativeDeviceFeaturesService.exitFullscreen(),
  
  // Capability checks
  getCapabilities: () => nativeDeviceFeaturesService.getCapabilities(),
  isSupported: (feature) => nativeDeviceFeaturesService.isSupported(feature)
};

export default nativeDeviceFeaturesService;