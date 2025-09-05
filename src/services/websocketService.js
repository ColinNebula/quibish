/**
 * WebSocket Service for Quibish
 * Handles real-time communication with server
 */

// Configuration
const WS_CONFIG = {
  URL: process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws',
  RECONNECT_ATTEMPTS: parseInt(process.env.REACT_APP_WS_RECONNECT_ATTEMPTS) || 5,
  RECONNECT_DELAY: parseInt(process.env.REACT_APP_WS_RECONNECT_DELAY) || 3000,
  RECONNECT_INTERVAL_MS: 2000,
  MAX_RECONNECT_DELAY_MS: 30000,
  PING_INTERVAL_MS: 30000,
  PONG_TIMEOUT_MS: 10000,
  CONNECTION_TIMEOUT_MS: 15000
};

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionListeners = [];
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.pongTimer = null;
    this.connectionTimer = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.intentionallyClosed = false;
    this.lastPingSent = null;
    this.lastPongReceived = null;
    this.pingHistory = []; // Store last 5 ping times
    this.connectionMetrics = {
      latency: 0,
      stability: 100, // 0-100 scale
      disconnects: 0,
      lastConnectionTime: null,
      reconnectAttempts: 0,
      failedPings: 0
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    // Don't try to connect if already connecting or connected
    if (this.isConnecting || this.isConnected) return;
    
    // Clear intentionally closed flag to allow connection
    this.intentionallyClosed = false;
    
    this.isConnecting = true;
    
    // If no URL is configured, skip connecting (useful for local dev without WS)
    if (!WS_CONFIG.URL) {
      console.info('WebSocket URL not configured; skipping connection');
      this.isConnecting = false;
      return;
    }
    
    try {
      // Create new WebSocket connection
      this.socket = new WebSocket(WS_CONFIG.URL);
      
      // Set connection timeout
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
      }
      
      this.connectionTimer = setTimeout(() => {
        if (!this.isConnected) {
          console.warn('WebSocket connection timeout');
          if (this.socket) {
            this.socket.close();
          }
          this.handleDisconnect(new Error('Connection timeout'));
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT_MS);

      // Configure WebSocket event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleDisconnect(error);
    }
  }

  /**
   * Disconnect from WebSocket server
   * @param {boolean} intentional - Whether the disconnect was intentional
   */
  disconnect(intentional = true) {
    this.intentionallyClosed = intentional;
    this.clearTimers();
    
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.socket = null;
    }
    
    if (this.isConnected) {
      this.isConnected = false;
      this.notifyConnectionChange(false, { reason: intentional ? 'User disconnected' : 'Connection closed' });
    }
  }

  /**
   * Reconnect to WebSocket server
   * @returns {Promise<boolean>} - Whether reconnection was successful
   */
  async reconnect() {
    console.log("Manual reconnection initiated");
    
    // Reset connection state
    this.intentionallyClosed = false;
    this.isConnected = false;
    this.isConnecting = false;
    
    // Clear any existing timers
    this.clearTimers();
    
    // Close existing socket if any
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing previous WebSocket connection:', error);
      }
      this.socket = null;
    }
    
    // Return promise that resolves when connected or rejects on timeout
    return new Promise((resolve, reject) => {
      // Set up connection listener before connecting
      const tempListener = (connected) => {
        if (connected) {
          clearTimeout(timeoutId);
          this.removeConnectionListener(tempListener);
          this.reconnectAttempts = 0; // Reset reconnect attempts on successful manual reconnect
          resolve(true);
        }
      };
      
      this.addConnectionListener(tempListener);
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.removeConnectionListener(tempListener);
        reject(new Error('Reconnection timeout'));
      }, WS_CONFIG.CONNECTION_TIMEOUT_MS * 1.5); // Allow a bit more time for manual reconnects
      
      // Connect anew
      this.connect();
    });
  }

  /**
   * Handle successful WebSocket connection
   */
  handleOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.intentionallyClosed = false;
    this.connectionMetrics.lastConnectionTime = new Date();
    
    // Clear connection timeout
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    // Start ping interval
    this.startPingInterval();
    
    // Notify listeners
    this.notifyConnectionChange(true, { reconnected: this.connectionMetrics.disconnects > 0 });
  }

  /**
   * Handle incoming WebSocket message
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle special system messages
      if (data.type === 'pong') {
        this.handlePong(data);
        return;
      }
      
      // Handle regular messages by notifying appropriate listeners
      if (data.type && this.listeners.has(data.type)) {
        this.listeners.get(data.type).forEach(callback => {
          try {
            callback(data.payload);
          } catch (error) {
            console.error(`Error in ${data.type} event handler:`, error);
          }
        });
      }
      
      // Also notify "all" listeners
      if (this.listeners.has('all')) {
        this.listeners.get('all').forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in "all" event handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket errors
   * @param {Event} event - WebSocket error event
   */
  handleError(event) {
    console.error('WebSocket error:', event);
    this.connectionMetrics.stability = Math.max(0, this.connectionMetrics.stability - 10);
    
    // Let onclose handle reconnection
  }

  /**
   * Handle WebSocket connection close
   * @param {CloseEvent} event - WebSocket close event
   */
  handleClose(event) {
    // Log close event details
    const reason = event.reason || 'No reason provided';
    const code = event.code;
    console.log(`WebSocket closed: [${code}] ${reason}`);
    
    this.handleDisconnect(new Error(`Connection closed: [${code}] ${reason}`));
  }

  /**
   * Handle disconnection (from any source)
   * @param {Error} error - Error that caused disconnection
   */
  handleDisconnect(error) {
    // Check if we're actually connected before processing disconnect
    if (!this.isConnected && !this.isConnecting) {
      return; // Already disconnected
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionMetrics.disconnects++;
    this.clearTimers();
    
    // Make sure socket is closed
    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        console.error("Error closing socket during disconnect:", err);
      }
      this.socket = null;
    }
    
    // Notify connection state change
    this.notifyConnectionChange(false, { 
      reason: error?.message || 'Connection lost',
      reconnecting: !this.intentionallyClosed,
      code: error.code
    });
    
    // Don't reconnect if intentionally closed
    if (this.intentionallyClosed) {
      console.log("Not reconnecting because connection was intentionally closed");
      return;
    }
    
    // Schedule reconnect with exponential backoff
    this.reconnectAttempts++;
    this.connectionMetrics.reconnectAttempts = this.reconnectAttempts;
    
    // Calculate backoff time
    const delay = Math.min(
      WS_CONFIG.RECONNECT_INTERVAL_MS * Math.pow(1.5, this.reconnectAttempts - 1),
      WS_CONFIG.MAX_RECONNECT_DELAY_MS
    );
    
    // Add jitter to prevent all clients reconnecting simultaneously
    const jitter = Math.random() * 1000;
    const reconnectDelay = delay + jitter;
    
    console.log(`Scheduling reconnect attempt in ${Math.round(reconnectDelay/1000)}s (attempt ${this.reconnectAttempts})`);
    
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, reconnectDelay);
  }

  /**
   * Send ping to server and wait for pong
   */
  ping() {
    if (!this.isConnected || !this.socket) return;
    
    try {
      const pingTime = Date.now();
      this.lastPingSent = pingTime;
      
      this.send('ping', { time: pingTime });
      
      // Start pong timeout
      this.pongTimer = setTimeout(() => {
        console.warn('WebSocket pong timeout');
        this.connectionMetrics.failedPings++;
        this.connectionMetrics.stability = Math.max(0, this.connectionMetrics.stability - 5);
        
        // After 3 consecutive failed pings, consider connection dead
        if (this.connectionMetrics.failedPings >= 3) {
          console.error('Multiple ping failures, reconnecting...');
          this.socket.close();
          this.handleDisconnect(new Error('Ping timeout'));
        }
      }, WS_CONFIG.PONG_TIMEOUT_MS);
    } catch (error) {
      console.error('Error sending ping:', error);
    }
  }

  /**
   * Handle pong response from server
   * @param {Object} data - Pong message data
   */
  handlePong(data) {
    // Clear pong timeout
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    
    // Calculate latency
    if (this.lastPingSent && data.pingTime) {
      const latency = Date.now() - this.lastPingSent;
      
      // Update connection metrics
      this.connectionMetrics.latency = latency;
      this.lastPongReceived = Date.now();
      this.connectionMetrics.failedPings = 0;
      
      // Store in history (keep last 5)
      this.pingHistory.push(latency);
      if (this.pingHistory.length > 5) {
        this.pingHistory.shift();
      }
      
      // Update stability based on latency trend
      this.updateStabilityMetric();
    }
  }

  /**
   * Start ping interval
   */
  startPingInterval() {
    // Clear any existing ping timer
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    // Start new ping interval
    this.pingTimer = setInterval(() => {
      this.ping();
    }, WS_CONFIG.PING_INTERVAL_MS);
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  /**
   * Update connection stability metric based on ping history
   */
  updateStabilityMetric() {
    if (this.pingHistory.length < 2) return;
    
    // Calculate average latency
    const avgLatency = this.pingHistory.reduce((sum, ping) => sum + ping, 0) / this.pingHistory.length;
    
    // Calculate latency variance
    const variance = this.pingHistory.reduce((sum, ping) => sum + Math.pow(ping - avgLatency, 2), 0) / this.pingHistory.length;
    
    // High variance means unstable connection
    const normalizedVariance = Math.min(variance / 10000, 1);
    
    // High latency affects stability
    const latencyFactor = Math.min(avgLatency / 1000, 1);
    
    // Combine factors with weights
    const stabilityRaw = 100 - (normalizedVariance * 50) - (latencyFactor * 30);
    
    // Apply smoothing with previous value (30% new, 70% old)
    this.connectionMetrics.stability = Math.max(0, Math.min(100, 
      0.7 * this.connectionMetrics.stability + 0.3 * stabilityRaw
    ));
  }

  /**
   * Send data to WebSocket server
   * @param {string} type - Message type
   * @param {any} payload - Message payload
   * @returns {boolean} - Whether send was successful
   */
  send(type, payload) {
    if (!this.isConnected || !this.socket) return false;
    
    try {
      const message = JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString()
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Add event listener for specific message type
   * @param {string} type - Message type or 'all' for all messages
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove listener
   */
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Remove event listener
   * @param {string} type - Message type
   * @param {Function} callback - Callback function
   */
  removeEventListener(type, callback) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Add connection state listener
   * @param {Function} listener - Listener function
   * @returns {Function} - Function to remove listener
   */
  addConnectionListener(listener) {
    this.connectionListeners.push(listener);
    
    // Return unsubscribe function
    return () => this.removeConnectionListener(listener);
  }

  /**
   * Remove connection state listener
   * @param {Function} listener - Listener function
   */
  removeConnectionListener(listener) {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  /**
   * Notify all connection listeners of state change
   * @param {boolean} connected - Whether connected
   * @param {Object} details - Connection details
   */
  notifyConnectionChange(connected, details = {}) {
    // Copy listeners array to avoid issues if a listener adds/removes another listener
    const listeners = [...this.connectionListeners];
    
    listeners.forEach(listener => {
      try {
        listener(connected, details);
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }

  /**
   * Get current connection quality
   * @returns {string} - Connection quality ('excellent', 'good', 'poor', 'critical', 'offline')
   */
  getConnectionQuality() {
    if (!this.isConnected) return 'offline';
    
    const { latency, stability } = this.connectionMetrics;
    
    if (stability > 90 && latency < 100) return 'excellent';
    if (stability > 70 && latency < 300) return 'good';
    if (stability > 40 && latency < 1000) return 'poor';
    return 'critical';
  }

  /**
   * Get detailed connection metrics
   * @returns {Object} - Connection metrics
   */
  getConnectionMetrics() {
    return {
      ...this.connectionMetrics,
      quality: this.getConnectionQuality(),
      connected: this.isConnected,
      pingHistory: [...this.pingHistory]
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
