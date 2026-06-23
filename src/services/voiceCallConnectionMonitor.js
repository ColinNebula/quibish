/**
 * VoiceCallConnectionMonitor
 * 
 * Monitors WebRTC peer connection health, detects failures, and provides
 * real-time statistics for voice calls. Enables automatic recovery and
 * quality-based user feedback.
 * 
 * Usage:
 * const monitor = new VoiceCallConnectionMonitor(peerConnection);
 * monitor.initialize();
 * 
 * monitor.on('connectionEstablished', () => console.log('Call ready'));
 * monitor.on('statsUpdate', (stats) => updateUI(stats));
 * monitor.on('connectionFailed', ({attempt}) => handleFailure(attempt));
 */

class VoiceCallConnectionMonitor {
  constructor(peerConnection, options = {}) {
    if (!peerConnection) {
      throw new Error('RTCPeerConnection instance required');
    }

    this.pc = peerConnection;
    this.options = {
      checkInterval: 1000,        // Check every 1 second
      iceTimeout: 10000,          // 10 seconds to connect
      failureThreshold: 3,        // 3 failures before giving up
      reconnectBackoff: 1000,     // 1 second initial backoff
      maxBackoff: 10000,          // 10 second max backoff
      ...options
    };

    // Statistics tracking
    this.stats = {
      connectionState: null,
      iceConnectionState: null,
      iceGatheringState: null,
      signalingState: null,
      
      // Timing
      startTime: Date.now(),
      lastCheck: null,
      checkCount: 0,
      lastConnectedTime: null,

      // Failure tracking
      failureCount: 0,
      consecutiveFailures: 0,
      reconnectAttempts: 0,

      // Media statistics
      audio: {
        bytesReceived: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0,
        audioLevel: 0,
        timestamp: null
      },
      video: {
        bytesReceived: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0,
        framesDecoded: 0,
        frameRate: 0,
        timestamp: null
      },

      // Network metrics
      latency: 0,              // Round trip time in ms
      bandwidth: 0,           // Available bitrate in bps
      packetLoss: 0,         // Percentage
      networkQuality: 'unknown',

      // ICE statistics
      candidateCount: 0,
      failedCandidates: 0,
      activeCandidatePair: null,

      // Connection history
      stateChanges: [],
      errors: []
    };

    // Event listeners registry
    this.listeners = [];

    // Internal state
    this.monitorInterval = null;
    this.iceTimeoutTimer = null;
    this.initialized = false;
    this.gatheringCompleted = false;
    this.reconnectTimer = null;
    this.backoffDelay = this.options.reconnectBackoff;

    // Previous stats for delta calculation
    this.prevStats = {
      bytesReceived: 0,
      packetsReceived: 0
    };
  }

  /**
   * Initialize monitoring and attach event listeners
   */
  initialize() {
    if (this.initialized) {
      console.warn('VoiceCallConnectionMonitor already initialized');
      return;
    }

    console.log('🚀 VoiceCallConnectionMonitor initializing...');

    // Attach event listeners
    this.pc.addEventListener('connectionstatechange', 
      this._handleConnectionStateChange.bind(this));
    this.pc.addEventListener('iceconnectionstatechange', 
      this._handleIceConnectionStateChange.bind(this));
    this.pc.addEventListener('icegatheringstatechange', 
      this._handleIceGatheringStateChange.bind(this));
    this.pc.addEventListener('signalingstatechange',
      this._handleSignalingStateChange.bind(this));
    this.pc.addEventListener('icecandidate', 
      this._handleIceCandidate.bind(this));
    this.pc.addEventListener('icecandidateerror', 
      this._handleIceCandidateError.bind(this));

    // Start monitoring
    this.startMonitoring();

    // Set ICE gathering timeout
    this._resetIceTimeout();

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Handle connection state changes
   */
  _handleConnectionStateChange() {
    const state = this.pc.connectionState;
    const prevState = this.stats.connectionState;
    
    this.stats.connectionState = state;
    this.stats.stateChanges.push({
      state,
      prevState,
      timestamp: Date.now()
    });

    console.log(`🔗 Connection State: ${prevState} → ${state}`);

    this.emit('connectionStateChange', { state, prevState });

    switch (state) {
      case 'connected':
      case 'completed':
        this.stats.lastConnectedTime = Date.now();
        this.stats.failureCount = 0;
        this.stats.reconnectAttempts = 0;
        this.backoffDelay = this.options.reconnectBackoff;
        this.emit('connectionEstablished');
        break;

      case 'disconnected':
        this.emit('connectionDisconnected');
        this._scheduleReconnect();
        break;

      case 'failed':
        this.stats.failureCount++;
        this.stats.consecutiveFailures++;
        this.emit('connectionFailed', { 
          attempt: this.stats.failureCount,
          retrying: this.stats.failureCount < this.options.failureThreshold
        });
        
        if (this.stats.failureCount < this.options.failureThreshold) {
          this._scheduleReconnect();
        } else {
          this.emit('connectionAborted', { 
            totalAttempts: this.stats.failureCount 
          });
        }
        break;

      case 'closed':
        this.emit('connectionClosed');
        this.stopMonitoring();
        break;
    }
  }

  /**
   * Handle ICE connection state changes
   */
  _handleIceConnectionStateChange() {
    const state = this.pc.iceConnectionState;
    const prevState = this.stats.iceConnectionState;
    
    this.stats.iceConnectionState = state;

    console.log(`❄️ ICE Connection State: ${prevState} → ${state}`);

    this.emit('iceStateChange', { state, prevState });

    switch (state) {
      case 'connected':
      case 'completed':
        this._clearIceTimeout();
        break;

      case 'failed':
      case 'disconnected':
        this.emit('iceConnectionDegraded', { state });
        // Attempt ICE restart
        this._performIceRestart();
        break;

      case 'closed':
        this._clearIceTimeout();
        break;
    }
  }

  /**
   * Handle ICE gathering state changes
   */
  _handleIceGatheringStateChange() {
    const state = this.pc.iceGatheringState;
    this.stats.iceGatheringState = state;

    console.log(`⛸️ ICE Gathering State: ${state}`);

    if (state === 'complete' && !this.gatheringCompleted) {
      this.gatheringCompleted = true;
      this.emit('iceCandidatesGathered', { 
        totalCandidates: this.stats.candidateCount 
      });
    }
  }

  /**
   * Handle signaling state changes
   */
  _handleSignalingStateChange() {
    const state = this.pc.signalingState;
    this.stats.signalingState = state;

    console.log(`📡 Signaling State: ${state}`);

    this.emit('signalingStateChange', { state });
  }

  /**
   * Handle new ICE candidates
   */
  _handleIceCandidate(event) {
    if (event.candidate) {
      this.stats.candidateCount++;
      const candidate = event.candidate;
      
      console.log(`✅ ICE Candidate (${this.stats.candidateCount}): ${candidate.protocol} ${candidate.type}`);

      this.emit('newIceCandidate', {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        protocol: candidate.protocol,
        type: candidate.type
      });
    }
  }

  /**
   * Handle ICE candidate errors
   */
  _handleIceCandidateError(event) {
    this.stats.failedCandidates++;
    this.stats.errors.push({
      type: 'ice-candidate-error',
      error: event.errorText,
      port: event.port,
      url: event.url,
      timestamp: Date.now()
    });

    console.warn(`❌ ICE Candidate Error: ${event.errorText} (${event.url})`);

    this.emit('iceCandidateError', { 
      error: event.errorText,
      url: event.url,
      port: event.port
    });
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring() {
    if (this.monitorInterval) return;

    console.log('📊 Starting connection health monitoring...');

    this.monitorInterval = setInterval(
      this._checkConnectionHealth.bind(this),
      this.options.checkInterval
    );
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this._clearIceTimeout();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    console.log('📊 Connection health monitoring stopped');
  }

  /**
   * Check connection health and gather statistics
   */
  async _checkConnectionHealth() {
    try {
      if (this.pc.connectionState === 'closed') {
        this.stopMonitoring();
        return;
      }

      const stats = await this.pc.getStats();
      this.stats.lastCheck = Date.now();
      this.stats.checkCount++;

      let audioStats = null;
      let videoStats = null;
      let candidatePair = null;
      let inboundAudio = null;
      let inboundVideo = null;

      // Process stats
      stats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          if (report.kind === 'audio') {
            inboundAudio = report;
          } else if (report.kind === 'video') {
            inboundVideo = report;
          }
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          candidatePair = report;
        }
      });

      // Parse audio stats
      if (inboundAudio) {
        const prevAudioBytes = this.stats.audio.bytesReceived;
        audioStats = {
          bytesReceived: inboundAudio.bytesReceived || 0,
          packetsReceived: inboundAudio.packetsReceived || 0,
          packetsLost: inboundAudio.packetsLost || 0,
          jitter: (inboundAudio.jitter || 0) * 1000, // Convert to ms
          audioLevel: inboundAudio.audioLevel || 0,
          bitrate: ((inboundAudio.bytesReceived - prevAudioBytes) * 8) / 
                   (this.options.checkInterval / 1000), // bps
          timestamp: inboundAudio.timestamp
        };

        this.stats.audio = audioStats;
      }

      // Parse video stats
      if (inboundVideo) {
        videoStats = {
          bytesReceived: inboundVideo.bytesReceived || 0,
          packetsReceived: inboundVideo.packetsReceived || 0,
          packetsLost: inboundVideo.packetsLost || 0,
          jitter: (inboundVideo.jitter || 0) * 1000,
          framesDecoded: inboundVideo.framesDecoded || 0,
          frameRate: inboundVideo.framesPerSecond || 0,
          timestamp: inboundVideo.timestamp
        };

        this.stats.video = videoStats;
      }

      // Parse candidate pair stats
      if (candidatePair) {
        this.stats.latency = (candidatePair.currentRoundTripTime || 0) * 1000; // ms
        this.stats.bandwidth = candidatePair.availableOutgoingBitrate || 0;
        this.stats.activeCandidatePair = {
          local: candidatePair.localCandidateId,
          remote: candidatePair.remoteCandidateId,
          protocol: candidatePair.protocol,
          priority: candidatePair.priority
        };
      }

      // Calculate network quality
      this._assessNetworkQuality();

      // Emit stats update
      this.emit('statsUpdate', {
        audio: audioStats,
        video: videoStats,
        latency: this.stats.latency,
        bandwidth: this.stats.bandwidth,
        quality: this.stats.networkQuality,
        packetLoss: this.stats.packetLoss
      });

    } catch (error) {
      console.error('❌ Error checking connection health:', error);
      this.stats.errors.push({
        type: 'health-check-error',
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Assess network quality based on metrics
   */
  _assessNetworkQuality() {
    const packetLoss = this.stats.audio.packetsLost / 
      Math.max(this.stats.audio.packetsReceived + this.stats.audio.packetsLost, 1) * 100;
    
    const jitter = this.stats.audio.jitter || 0;
    const latency = this.stats.latency || 0;

    this.stats.packetLoss = packetLoss;

    // Quality assessment based on industry standards
    if (packetLoss < 1 && latency < 30 && jitter < 10) {
      this.stats.networkQuality = 'excellent';
    } else if (packetLoss < 3 && latency < 80 && jitter < 20) {
      this.stats.networkQuality = 'good';
    } else if (packetLoss < 5 && latency < 150 && jitter < 50) {
      this.stats.networkQuality = 'fair';
    } else if (packetLoss < 10) {
      this.stats.networkQuality = 'poor';
    } else {
      this.stats.networkQuality = 'very-poor';
    }

    // Log warnings for poor quality
    if (this.stats.networkQuality === 'poor' || this.stats.networkQuality === 'very-poor') {
      console.warn(`⚠️ Poor network quality: ${this.stats.networkQuality}`, {
        packetLoss: `${packetLoss.toFixed(1)}%`,
        latency: `${latency.toFixed(0)}ms`,
        jitter: `${jitter.toFixed(2)}ms`
      });
    }
  }

  /**
   * Perform ICE restart
   */
  async _performIceRestart() {
    try {
      console.log('🔄 Performing ICE restart...');
      await this.pc.restartIce();
      this._resetIceTimeout();
      this.emit('iceRestarted');
    } catch (error) {
      console.error('❌ Failed to restart ICE:', error);
      this.emit('iceRestartFailed', { error: error.message });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.stats.reconnectAttempts++;
    const delay = Math.min(this.backoffDelay, this.options.maxBackoff);

    console.log(`⏱️ Scheduling reconnect in ${delay}ms (attempt ${this.stats.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this._performIceRestart();
    }, delay);

    // Exponential backoff
    this.backoffDelay *= 1.5;
  }

  /**
   * Reset ICE gathering timeout
   */
  _resetIceTimeout() {
    this._clearIceTimeout();

    this.iceTimeoutTimer = setTimeout(() => {
      if (this.stats.iceConnectionState === 'checking' || 
          this.stats.iceConnectionState === 'new') {
        console.warn('⏱️ ICE gathering timeout - may not establish connection');
        this.emit('iceGatheringTimeout');
      }
    }, this.options.iceTimeout);
  }

  /**
   * Clear ICE gathering timeout
   */
  _clearIceTimeout() {
    if (this.iceTimeoutTimer) {
      clearTimeout(this.iceTimeoutTimer);
      this.iceTimeoutTimer = null;
    }
  }

  /**
   * Get current statistics snapshot
   */
  getStats() {
    return JSON.parse(JSON.stringify(this.stats));
  }

  /**
   * Get formatted statistics for display
   */
  getFormattedStats() {
    return {
      connection: this.stats.connectionState,
      quality: this.stats.networkQuality,
      latency: `${Math.round(this.stats.latency)}ms`,
      packetLoss: `${this.stats.packetLoss.toFixed(1)}%`,
      jitter: `${this.stats.audio.jitter.toFixed(2)}ms`,
      uptime: Math.round((Date.now() - this.stats.startTime) / 1000),
      failureAttempts: this.stats.failureCount
    };
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    const listener = { event, callback };
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(
        l => l.event !== event || l.callback !== callback
      );
    };
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => {
        try {
          l.callback(data);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
  }

  /**
   * Cleanup and destroy monitor
   */
  destroy() {
    this.stopMonitoring();
    this.listeners = [];
    console.log('🧹 VoiceCallConnectionMonitor destroyed');
  }
}

// Ensure proper module exports for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceCallConnectionMonitor;
  module.exports.default = VoiceCallConnectionMonitor;
}

export default VoiceCallConnectionMonitor;
