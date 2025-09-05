/**
 * ConnectionManager.js
 * Advanced asynchronous connection management for Quibish
 */

class ConnectionManager {
  constructor() {
    // Connection state
    this.isConnected = false;
    this.connectionPhase = 'idle'; // 'idle', 'connecting', 'connected', 'disconnecting', 'reconnecting'
    this.connectionListeners = new Set();
    this.stateChangeListeners = new Set();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000; // ms
    this.lastHeartbeat = null;
    this.heartbeatInterval = null;
    this.reconnectTimer = null;
    
    // Connection quality metrics
    this.metrics = {
      latency: 0,           // Current latency in ms
      latencyHistory: [],   // Last 10 latency measurements
      packetLoss: 0,        // Percentage of lost packets
      lastSuccessfulSync: 0, // Timestamp of last successful server sync
      disconnections: 0,    // Number of disconnections in current session
      failedAttempts: 0,    // Number of failed connection attempts
      stability: 100,       // Connection stability score (0-100)
      qualityLevel: 'unknown' // 'excellent', 'good', 'fair', 'poor', 'critical', 'offline'
    };
    
    // Debug and analytics
    this.debug = process.env.NODE_ENV !== 'production';
    this.connectionEvents = [];
    this.maxEventHistory = 50;
    
    // Bind methods to prevent 'this' context issues
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.checkConnection = this.checkConnection.bind(this);
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
  }

  /**
   * Establish connection to server
   * @returns {Promise<boolean>} Connection success
   */
  async connect() {
    try {
      if (this.isConnected || this.connectionPhase === 'connecting') {
        this.log('Already connected or connecting');
        return this.isConnected;
      }
      
      this.setConnectionPhase('connecting');
      this.logEvent('connect_attempt');
      
      // Simulate connection latency (remove in production)
      // In a real app, this would be your actual connection logic
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = await this.simulateServerConnection();
      
      if (success) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setConnectionPhase('connected');
        this.startHeartbeat();
        this.processMessageQueue();
        this.metrics.lastSuccessfulSync = Date.now();
        this.notifyConnectionChange(true);
        this.logEvent('connect_success');
        return true;
      } else {
        this.setConnectionPhase('idle');
        this.logEvent('connect_failed');
        return false;
      }
    } catch (error) {
      this.log('Connection error:', error);
      this.setConnectionPhase('idle');
      this.metrics.failedAttempts++;
      this.updateConnectionQuality();
      this.logEvent('connect_error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Disconnect from server
   * @param {boolean} intentional - Whether disconnect was intentional
   * @returns {Promise<void>}
   */
  async disconnect(intentional = true) {
    try {
      if (!this.isConnected) {
        this.log('Already disconnected');
        return;
      }
      
      this.setConnectionPhase('disconnecting');
      this.logEvent('disconnect', { intentional });
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // In a real implementation, close any active connections
      // For example: this.socket.close();
      
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 200));
      
      this.isConnected = false;
      this.setConnectionPhase('idle');
      
      if (!intentional) {
        this.metrics.disconnections++;
        this.updateConnectionQuality();
      }
      
      this.notifyConnectionChange(false, { intentional });
      this.logEvent('disconnected', { intentional });
    } catch (error) {
      this.log('Error during disconnect:', error);
      this.isConnected = false;
      this.setConnectionPhase('idle');
      this.logEvent('disconnect_error', { error: error.message });
      
      // Still notify listeners even if there was an error
      this.notifyConnectionChange(false, { error: error.message });
    }
  }
  
  /**
   * Attempt to reconnect after connection loss
   * @returns {Promise<boolean>} Reconnection success
   */
  async reconnect() {
    try {
      if (this.isConnected) {
        return true;
      }
      
      if (this.connectionPhase === 'reconnecting') {
        this.log('Already attempting to reconnect');
        return false;
      }
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.log('Max reconnection attempts reached');
        this.logEvent('max_reconnect_attempts');
        return false;
      }
      
      this.reconnectAttempts++;
      this.setConnectionPhase('reconnecting');
      this.logEvent('reconnect_attempt', { attempt: this.reconnectAttempts });
      
      // Calculate backoff delay
      const backoffDelay = Math.min(
        this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
        30000 // Max 30 seconds
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const delay = backoffDelay + jitter;
      
      this.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
      
      // Wait for backoff period
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const success = await this.connect();
      
      if (success) {
        this.logEvent('reconnect_success');
        return true;
      } else {
        this.logEvent('reconnect_failed');
        
        // Schedule next attempt
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnect();
          }, this.calculateNextReconnectDelay());
        }
        
        return false;
      }
    } catch (error) {
      this.log('Reconnection error:', error);
      this.setConnectionPhase('idle');
      this.logEvent('reconnect_error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Check current connection status
   * @returns {Promise<boolean>} Is connected
   */
  async checkConnection() {
    try {
      if (!this.isConnected) {
        return false;
      }
      
      const startTime = Date.now();
      this.logEvent('connection_check');
      
      // In a real app, you would ping your server
      // Simulating ping with random response time and occasional failure
      const success = await this.simulatePing();
      
      if (success) {
        const latency = Date.now() - startTime;
        this.updateLatency(latency);
        this.lastHeartbeat = Date.now();
        return true;
      } else {
        this.logEvent('connection_check_failed');
        this.metrics.packetLoss += 10;
        this.updateConnectionQuality();
        
        // If we've had multiple failures, disconnect
        if (this.metrics.packetLoss > 50) {
          this.log('Connection appears to be down');
          await this.disconnect(false);
          return false;
        }
        
        return this.isConnected;
      }
    } catch (error) {
      this.log('Error checking connection:', error);
      this.logEvent('connection_check_error', { error: error.message });
      return false;
    }
  }
  
  /**
   * Start heartbeat to monitor connection
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * Send heartbeat to server
   */
  async sendHeartbeat() {
    try {
      const connected = await this.checkConnection();
      
      // If not connected, attempt reconnect
      if (!connected && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect();
      }
    } catch (error) {
      this.log('Heartbeat error:', error);
    }
  }
  
  /**
   * Add message to queue to be sent when connected
   * @param {Object} message - Message to send
   */
  queueMessage(message) {
    this.messageQueue.push({
      message,
      timestamp: Date.now(),
      attempts: 0
    });
    
    this.log(`Message queued. Queue size: ${this.messageQueue.length}`);
    
    // Try to process the queue immediately if we're connected
    if (this.isConnected) {
      this.processMessageQueue();
    } else {
      this.connect(); // Try to connect if not already connected
    }
  }
  
  /**
   * Process pending message queue
   */
  async processMessageQueue() {
    if (!this.isConnected || this.messageQueue.length === 0) {
      return;
    }
    
    this.log(`Processing message queue (${this.messageQueue.length} messages)`);
    
    // Process messages in batches
    const batch = this.messageQueue.slice(0, 5);
    
    for (const item of batch) {
      try {
        // In a real app, send to your server
        // await api.sendMessage(item.message);
        
        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Remove from queue on success
        this.messageQueue = this.messageQueue.filter(m => m !== item);
        this.logEvent('message_sent', { queueSize: this.messageQueue.length });
      } catch (error) {
        this.log('Error sending queued message:', error);
        
        // Increment attempt counter
        item.attempts++;
        
        // Remove from queue if too many attempts
        if (item.attempts > 3) {
          this.messageQueue = this.messageQueue.filter(m => m !== item);
          this.logEvent('message_abandoned', { reason: 'too_many_attempts' });
        }
      }
    }
    
    // If there are more messages, continue processing
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), 500);
    }
  }
  
  /**
   * Update connection latency
   * @param {number} latency - Measured latency in ms
   */
  updateLatency(latency) {
    this.metrics.latency = latency;
    
    // Add to history, keep last 10
    this.metrics.latencyHistory.push(latency);
    if (this.metrics.latencyHistory.length > 10) {
      this.metrics.latencyHistory.shift();
    }
    
    // Update quality based on latency
    this.updateConnectionQuality();
  }
  
  /**
   * Update connection quality metrics
   */
  updateConnectionQuality() {
    if (!this.isConnected) {
      this.metrics.qualityLevel = 'offline';
      this.metrics.stability = 0;
      return;
    }
    
    // Calculate average latency
    const avgLatency = this.metrics.latencyHistory.length > 0
      ? this.metrics.latencyHistory.reduce((sum, l) => sum + l, 0) / this.metrics.latencyHistory.length
      : this.metrics.latency;
    
    // Calculate stability score
    let stabilityScore = 100;
    
    // Reduce for high latency
    if (avgLatency > 300) {
      stabilityScore -= Math.min(40, (avgLatency - 300) / 10);
    }
    
    // Reduce for packet loss
    stabilityScore -= this.metrics.packetLoss;
    
    // Reduce for disconnections
    stabilityScore -= this.metrics.disconnections * 5;
    
    // Reduce for failed attempts
    stabilityScore -= this.metrics.failedAttempts * 2;
    
    // Ensure score is between 0-100
    this.metrics.stability = Math.max(0, Math.min(100, stabilityScore));
    
    // Determine quality level
    if (this.metrics.stability > 90) {
      this.metrics.qualityLevel = 'excellent';
    } else if (this.metrics.stability > 70) {
      this.metrics.qualityLevel = 'good';
    } else if (this.metrics.stability > 50) {
      this.metrics.qualityLevel = 'fair';
    } else if (this.metrics.stability > 30) {
      this.metrics.qualityLevel = 'poor';
    } else {
      this.metrics.qualityLevel = 'critical';
    }
    
    // Notify quality change
    this.notifyStateChange();
  }
  
  /**
   * Calculate delay for next reconnection attempt
   * @returns {number} Delay in milliseconds
   */
  calculateNextReconnectDelay() {
    const baseDelay = this.baseReconnectDelay;
    const exponential = Math.pow(1.5, this.reconnectAttempts);
    const maxDelay = 30000; // 30 seconds max
    
    return Math.min(baseDelay * exponential, maxDelay);
  }
  
  /**
   * Add connection state listener
   * @param {Function} listener - Function(isConnected, details)
   * @returns {Function} Unsubscribe function
   */
  addConnectionListener(listener) {
    this.connectionListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
  
  /**
   * Add connection state change listener
   * @param {Function} listener - Function(state)
   * @returns {Function} Unsubscribe function
   */
  addStateChangeListener(listener) {
    this.stateChangeListeners.add(listener);
    
    // Immediately notify of current state
    try {
      listener({
        isConnected: this.isConnected,
        connectionPhase: this.connectionPhase,
        metrics: { ...this.metrics },
        queueSize: this.messageQueue.length
      });
    } catch (error) {
      this.log('Error in state change listener:', error);
    }
    
    // Return unsubscribe function
    return () => {
      this.stateChangeListeners.delete(listener);
    };
  }
  
  /**
   * Notify all listeners of connection change
   * @param {boolean} connected - New connection state
   * @param {Object} details - Additional details
   */
  notifyConnectionChange(connected, details = {}) {
    const listeners = Array.from(this.connectionListeners);
    
    for (const listener of listeners) {
      try {
        listener(connected, {
          ...details,
          timestamp: Date.now(),
          metrics: { ...this.metrics }
        });
      } catch (error) {
        this.log('Error in connection listener:', error);
      }
    }
    
    this.notifyStateChange();
  }
  
  /**
   * Notify state change listeners
   */
  notifyStateChange() {
    const state = {
      isConnected: this.isConnected,
      connectionPhase: this.connectionPhase,
      metrics: { ...this.metrics },
      queueSize: this.messageQueue.length
    };
    
    const listeners = Array.from(this.stateChangeListeners);
    
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (error) {
        this.log('Error in state change listener:', error);
      }
    }
  }
  
  /**
   * Update connection phase
   * @param {string} phase - New connection phase
   */
  setConnectionPhase(phase) {
    if (this.connectionPhase !== phase) {
      this.connectionPhase = phase;
      this.notifyStateChange();
    }
  }
  
  /**
   * Log connection events for debugging
   * @param {string} eventType - Event type
   * @param {Object} details - Event details
   */
  logEvent(eventType, details = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      ...details
    };
    
    this.connectionEvents.unshift(event);
    
    // Trim history to prevent memory issues
    if (this.connectionEvents.length > this.maxEventHistory) {
      this.connectionEvents.length = this.maxEventHistory;
    }
  }
  
  /**
   * Console log if debug enabled
   */
  log(...args) {
    if (this.debug) {
      console.log('[ConnectionManager]', ...args);
    }
  }
  
  /**
   * Get connection metrics and status
   * @returns {Object} Connection state and metrics
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionPhase: this.connectionPhase,
      metrics: { ...this.metrics },
      queueSize: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      events: this.connectionEvents.slice(0, 5) // Last 5 events
    };
  }
  
  // Simulation methods for demo
  
  async simulateServerConnection() {
    // Simulate successful connection 90% of the time
    return Math.random() > 0.1;
  }
  
  async simulatePing() {
    // Simulate successful ping 95% of the time
    return Math.random() > 0.05;
  }
}

// Create and export singleton instance
const connectionManager = new ConnectionManager();
export default connectionManager;
