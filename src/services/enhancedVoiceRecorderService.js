/**
 * Enhanced Voice Recorder Service
 * Provides comprehensive voice recording functionality with real audio capture,
 * visual feedback, audio processing, and file management.
 */

class EnhancedVoiceRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.recordingStartTime = 0;
    this.pausedDuration = 0;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.animationFrame = null;
    
    // Recording configuration
    this.config = {
      mimeType: this.getSupportedMimeType(),
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: null, // Audio only
      sampleRate: 44100,
      channelCount: 1, // Mono for smaller file size
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };

    // Event listeners
    this.listeners = {
      onStart: [],
      onStop: [],
      onPause: [],
      onResume: [],
      onDataAvailable: [],
      onError: [],
      onVolumeChange: []
    };

    this.initialize();
  }

  // Initialize the service
  async initialize() {
    try {
      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }

      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      console.log('✅ Voice Recorder Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Voice Recorder Service initialization failed:', error);
      this.emit('onError', { type: 'initialization', error });
      return false;
    }
  }

  // Get supported MIME type for recording
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
      'audio/aac'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`📱 Using MIME type: ${type}`);
        return type;
      }
    }

    console.warn('⚠️ No preferred audio MIME type supported, using default');
    return 'audio/webm'; // Fallback
  }

  // Request microphone permission and start recording
  async startRecording() {
    try {
      if (this.isRecording) {
        console.warn('⚠️ Recording already in progress');
        return false;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this.config.channelCount,
          sampleRate: this.config.sampleRate,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      });

      this.audioStream = stream;
      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.pausedDuration = 0;

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.config.mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond
      });

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.emit('onDataAvailable', { data: event.data });
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        this.emit('onError', { type: 'recording', error: event.error });
      };

      // Set up audio analysis for volume visualization
      await this.setupAudioAnalysis(stream);

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.isPaused = false;

      // Start volume monitoring
      this.startVolumeMonitoring();

      console.log('🎤 Recording started successfully');
      this.emit('onStart', { 
        startTime: this.recordingStartTime,
        config: this.config 
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.emit('onError', { type: 'start', error });
      return false;
    }
  }

  // Stop recording and generate audio blob
  async stopRecording() {
    try {
      if (!this.isRecording) {
        console.warn('⚠️ No recording in progress');
        return null;
      }

      // Stop MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Stop volume monitoring
      this.stopVolumeMonitoring();

      // Stop audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.isRecording = false;
      this.isPaused = false;

      console.log('🛑 Recording stopped successfully');
      
      // Return the promise that resolves when the recording is processed
      return new Promise((resolve) => {
        this.recordingStopResolver = resolve;
      });
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      this.emit('onError', { type: 'stop', error });
      return null;
    }
  }

  // Handle recording stop and create audio blob
  handleRecordingStop() {
    try {
      // Create audio blob from chunks
      const audioBlob = new Blob(this.audioChunks, { 
        type: this.config.mimeType 
      });

      const duration = this.getRecordingDuration();
      const size = audioBlob.size;

      console.log(`🎵 Audio recorded: ${duration}ms, ${(size / 1024).toFixed(2)}KB`);

      const recordingData = {
        blob: audioBlob,
        duration,
        size,
        mimeType: this.config.mimeType,
        url: URL.createObjectURL(audioBlob),
        timestamp: new Date().toISOString()
      };

      this.emit('onStop', recordingData);

      // Resolve the promise from stopRecording
      if (this.recordingStopResolver) {
        this.recordingStopResolver(recordingData);
        this.recordingStopResolver = null;
      }

      return recordingData;
    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      this.emit('onError', { type: 'processing', error });
      return null;
    }
  }

  // Pause recording
  pauseRecording() {
    try {
      if (!this.isRecording || this.isPaused) {
        return false;
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.pause();
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        console.log('⏸️ Recording paused');
        this.emit('onPause', { pauseTime: this.pauseStartTime });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to pause recording:', error);
      this.emit('onError', { type: 'pause', error });
      return false;
    }
  }

  // Resume recording
  resumeRecording() {
    try {
      if (!this.isRecording || !this.isPaused) {
        return false;
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume();
        this.isPaused = false;
        
        // Track paused duration
        if (this.pauseStartTime) {
          this.pausedDuration += Date.now() - this.pauseStartTime;
          this.pauseStartTime = 0;
        }
        
        console.log('▶️ Recording resumed');
        this.emit('onResume', { resumeTime: Date.now() });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to resume recording:', error);
      this.emit('onError', { type: 'resume', error });
      return false;
    }
  }

  // Cancel recording without saving
  cancelRecording() {
    try {
      this.audioChunks = []; // Clear chunks to prevent saving
      this.stopRecording();
      console.log('❌ Recording cancelled');
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel recording:', error);
      return false;
    }
  }

  // Set up audio analysis for volume visualization
  async setupAudioAnalysis(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      
      this.microphone.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      console.log('🎵 Audio analysis setup complete');
    } catch (error) {
      console.error('❌ Failed to setup audio analysis:', error);
      // Audio analysis is optional, continue without it
    }
  }

  // Start volume monitoring for visual feedback
  startVolumeMonitoring() {
    if (!this.analyser || !this.dataArray) return;

    const updateVolume = () => {
      if (!this.isRecording) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average volume
      const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
      const volume = Math.round((average / 255) * 100);
      
      this.emit('onVolumeChange', { volume, rawData: this.dataArray });
      
      this.animationFrame = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  // Stop volume monitoring
  stopVolumeMonitoring() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Get current recording duration
  getRecordingDuration() {
    if (!this.isRecording && this.recordingStartTime === 0) {
      return 0;
    }

    const currentTime = this.isRecording ? Date.now() : this.recordingStartTime;
    return Math.max(0, currentTime - this.recordingStartTime - this.pausedDuration);
  }

  // Format duration for display
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `0:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Get recording state
  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.getRecordingDuration(),
      formattedDuration: this.formatDuration(this.getRecordingDuration()),
      hasPermission: !!this.audioStream,
      mimeType: this.config.mimeType
    };
  }

  // Convert blob to different formats if needed
  async convertAudio(blob, targetMimeType) {
    try {
      // If already in target format, return as-is
      if (blob.type === targetMimeType) {
        return blob;
      }

      // For now, return original blob
      // Future enhancement: implement actual audio conversion
      console.warn(`⚠️ Audio conversion from ${blob.type} to ${targetMimeType} not implemented`);
      return blob;
    } catch (error) {
      console.error('❌ Audio conversion failed:', error);
      return blob;
    }
  }

  // Check if browser supports voice recording
  static isSupported() {
    return !!(
      window.MediaRecorder &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  // Get recording capabilities
  static getCapabilities() {
    if (!EnhancedVoiceRecorderService.isSupported()) {
      return { supported: false };
    }

    const capabilities = {
      supported: true,
      mimeTypes: [],
      features: {
        pause: true,
        resume: true,
        volumeMonitoring: !!(window.AudioContext || window.webkitAudioContext),
        realTimeAnalysis: true
      }
    };

    // Check supported MIME types
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
      'audio/aac'
    ];

    types.forEach(type => {
      if (MediaRecorder.isTypeSupported(type)) {
        capabilities.mimeTypes.push(type);
      }
    });

    return capabilities;
  }

  // Event system
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  cleanup() {
    this.cancelRecording();
    this.stopVolumeMonitoring();
    
    // Clear all event listeners
    Object.keys(this.listeners).forEach(event => {
      this.listeners[event] = [];
    });

    console.log('🧹 Voice Recorder Service cleaned up');
  }
}

// Create and export singleton instance
const enhancedVoiceRecorderService = new EnhancedVoiceRecorderService();

export default enhancedVoiceRecorderService;