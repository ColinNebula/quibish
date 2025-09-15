/**
 * Enhanced WebSocket Service
 * Features:
 * - Robust connection handling with heartbeats
 * - Adaptive reconnection strategy with exponential backoff
 * - Connection quality monitoring
 * - Offline mode support with queuing
 * - Network detection and bandwidth management
 * - Automatic recovery from network issues
 * - Using reconnecting-websocket for reliable reconnection
 */

import ReconnectingWebSocket from 'reconnecting-websocket';

class EnhancedWebSocketService {
  constructor() {
    // Connection state
    this.socket = null;
    this.isConnected = false;
    this.connectionQuality = 'unknown'; // unknown, good, poor, critical, offline
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.offlineMode = false;
    this.lastMessageReceived = Date.now();
    this.lastPingSent = null;
    this.pingInterval = 15000; // 15 seconds
    this.pingTimeout = 5000; // 5 seconds
    this.pingTimer = null;
    this.connectionStateListeners = [];
    this.messageHandlers = {};
    this.messageQueue = [];
    this.networkType = 'unknown'; // unknown, wifi, cellular, ethernet, etc.
    this.lastNetworkCheck = Date.now();
    this.connectionRecoveryTimer = null;
    this.lastMessageId = 0;
    this.connectionHealth = 100; // 0-100% health score
    this.consecutiveFailedPings = 0;
    this.networkChangeHandler = null;
    this.recoveryInProgress = false;
    
    // Performance metrics
    this.metrics = {
      latency: 0, // in ms
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reconnections: 0,
      uptime: 0,
      bytesReceived: 0,
      bytesSent: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      connectionHistory: []
    };
    
    // Initialize network info detection
    this.detectNetworkInfo();
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }
  
  /**
   * Initialize the connection to the WebSocket server
   */
  connect(url = 'ws://localhost:8080/ws') {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    // Mark connection start time
    const connectionStartTime = Date.now();
    
    // Check for saved connection state
    const savedConnectionState = this.loadConnectionState();
    const connectionId = savedConnectionState?.connectionId || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      // Add session ID to URL for resuming connection if supported by server
      const urlWithSessionInfo = this.addConnectionParams(url, {
        connectionId,
        lastMessageId: savedConnectionState?.lastMessageId || 0,
        clientId: this.getClientId()
      });
      
      // Use ReconnectingWebSocket with enhanced persistence options
      this.socket = new ReconnectingWebSocket(urlWithSessionInfo, [], this.reconnectOptions || {
        // Default reconnection behavior with persistent session
        maxReconnectionDelay: 30000, // Max delay between reconnection attempts (ms)
        minReconnectionDelay: 1000, // Min delay between reconnection attempts (ms)
        reconnectionDelayGrowFactor: 1.5, // Exponential factor for reconnection delay
        connectionTimeout: 8000, // Initial connection timeout
        maxRetries: Infinity, // Keep trying indefinitely
        debug: false // Enable for detailed logging
      });
      
      this.socket.onopen = () => {
        // Connection established
        this.isConnected = true;
        this.connectionQuality = 'good';
        this.reconnectAttempts = 0;
        
        // Record connection latency
        const connectionLatency = Date.now() - connectionStartTime;
        this.metrics.latency = connectionLatency;
        
        // Add to connection history
        this.metrics.connectionHistory.push({
          event: 'connected',
          timestamp: Date.now(),
          latency: connectionLatency
        });
        
        // Start heartbeat mechanism
        this.startHeartbeat();
        
        // Process any queued messages
        this.processQueue();
        
        // Save connection state for persistence
        this.saveConnectionState({
          connectionId: this.reconnectOptions?.connectionId,
          lastConnected: Date.now(),
          lastMessageId: this.lastMessageId || 0
        });
        
        // Notify listeners
        this.notifyStateChange(true, { 
          quality: this.connectionQuality,
          persistent: true
        });
        
        console.log(`WebSocket connected in ${connectionLatency}ms with persistent connection ID: ${this.reconnectOptions?.connectionId}`);
        
        // Register connection to periodically update persistence info
        this.startConnectionPersistence();
      };
      
      this.socket.onclose = (event) => {
        // Connection closed
        this.isConnected = false;
        
        // Add to connection history
        this.metrics.connectionHistory.push({
          event: 'disconnected',
          timestamp: Date.now(),
          code: event.code,
          reason: event.reason
        });
        
        // Stop heartbeat
        this.stopHeartbeat();
        
        // Determine if this was a normal closure or abnormal
        const isAbnormal = event.code !== 1000 && event.code !== 1001;
        
        // The ReconnectingWebSocket library will handle reconnection automatically
        // but we still want to notify our listeners
        if (isAbnormal && !this.offlineMode) {
          console.log(`WebSocket connection closed abnormally: ${event.code}. Reconnecting handled by reconnecting-websocket...`);
          this.notifyStateChange(false, { 
            code: event.code, 
            reason: event.reason,
            reconnecting: true 
          });
        } else {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          // Notify listeners
          this.notifyStateChange(false, { code: event.code, reason: event.reason });
        }
      };
      
      this.socket.onerror = (error) => {
        // Connection error
        console.error('WebSocket error:', error);
        
        // Add to connection history
        this.metrics.connectionHistory.push({
          event: 'error',
          timestamp: Date.now(),
          error: error.message || 'Unknown error'
        });
        
        // Track error count
        this.metrics.errors++;
        
        // Notify listeners - but don't change connection state yet, onclose will be called
        this.notifyStateChange(this.isConnected, { error: true, message: 'Connection error' });
      };
      
      this.socket.onmessage = (event) => {
        try {
          // Message received
          const message = JSON.parse(event.data);
          
          // Track message ID for session persistence
          if (message.id) {
            this.lastMessageId = Math.max(this.lastMessageId || 0, message.id);
            
            // Save connection state periodically based on message IDs
            if (this.enableSessionPersistence && this.lastMessageId % 10 === 0) {
              this.saveConnectionState({
                connectionId: this.reconnectOptions?.connectionId,
                lastMessageId: this.lastMessageId,
                lastConnected: Date.now()
              });
            }
          }
          
          this.handleMessage(message);
          
          // Update metrics
          this.metrics.messagesReceived++;
          this.metrics.bytesReceived += event.data.length;
          this.metrics.lastActivity = Date.now();
          this.lastMessageReceived = Date.now();
        } catch (error) {
          console.error('Error parsing message:', error);
          this.metrics.errors++;
        }
      };
      
      return true;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnected = false;
      this.metrics.errors++;
      return false;
    }
  }
  
  /**
   * Initialize WebSocket with configuration options
   * @param {Object} options - Configuration options
   * @param {string} options.url - WebSocket server URL
   * @param {Object} options.reconnectOptions - Reconnection settings
   * @param {number} options.heartbeatInterval - Milliseconds between heartbeats
   * @param {boolean} options.offlineSupport - Whether to queue messages when offline
   * @param {boolean} options.debug - Enable debug logging
   * @param {boolean} options.enableSessionPersistence - Whether to enable persistent connections
   */
  initialize(options = {}) {
    // Store URL and other settings
    this.serverUrl = options.url || 'ws://localhost:8080/ws';
    this.pingInterval = options.heartbeatInterval || 15000;
    
    // Initialize session persistence if enabled (default to true)
    this.enableSessionPersistence = options.enableSessionPersistence !== false;
    
    // Set last message ID tracking for session resumption
    this.lastMessageId = 0;
    
    // Update max reconnect attempts if provided
    if (options.reconnectOptions && options.reconnectOptions.maxAttempts) {
      this.maxReconnectAttempts = options.reconnectOptions.maxAttempts;
    } else if (this.enableSessionPersistence) {
      // For persistent connections, use infinite retries by default
      this.maxReconnectAttempts = Infinity;
    }
    
    // Load saved connection state if persistence is enabled
    let savedConnectionState = null;
    if (this.enableSessionPersistence) {
      savedConnectionState = this.loadConnectionState();
      if (savedConnectionState) {
        this.lastMessageId = savedConnectionState.lastMessageId || 0;
      }
    }
    
    // Store reconnection options for ReconnectingWebSocket
    this.reconnectOptions = {
      maxReconnectionDelay: options.reconnectOptions?.maxDelay || 30000,
      minReconnectionDelay: options.reconnectOptions?.initialDelay || 1000,
      reconnectionDelayGrowFactor: 1.5,
      connectionTimeout: 8000,
      maxRetries: this.maxReconnectAttempts,
      // Add connection ID for session resumption
      connectionId: savedConnectionState?.connectionId || 
                   `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
    
    // Set up network monitoring for resilience
    this.monitorNetworkChanges();
    
    // Connect to WebSocket server
    const success = this.connect(this.serverUrl);
    
    // Set debug mode
    if (options.debug) {
      console.log('EnhancedWebSocketService initialized with options:', {
        url: options.url ? '[URL REDACTED]' : null,
        reconnectOptions: this.reconnectOptions,
        heartbeatInterval: this.pingInterval,
        offlineSupport: options.offlineSupport,
        persistenceEnabled: this.enableSessionPersistence
      });
    }
    
    return success;
  }

  /**
   * Close the WebSocket connection
   */
  disconnect() {
    if (this.socket) {
      // Stop heartbeat
      this.stopHeartbeat();
      
      try {
        this.socket.close(1000, 'Normal closure');
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      
      this.isConnected = false;
      this.notifyStateChange(false, { reason: 'Manual disconnect' });
    }
  }
  
  /**
   * Reconnect to the WebSocket server
   */
  async reconnect() {
    // Close existing connection if any
    if (this.socket) {
      // For ReconnectingWebSocket, calling close() will prevent automatic reconnection
      // We need to call reconnect() instead to force a new connection attempt
      try {
        // ReconnectingWebSocket has a reconnect method
        if (typeof this.socket.reconnect === 'function') {
          this.socket.reconnect();
        } else {
          // Fall back to our old approach if not using ReconnectingWebSocket
          this.socket.close(1000, 'Reconnecting');
          this.socket = null;
          this.connect(this.serverUrl);
        }
      } catch (error) {
        console.error('Error during reconnect:', error);
        
        // Fallback reconnection
        this.socket = null;
        this.connect(this.serverUrl);
      }
    } else {
      // No socket exists, create a new connection
      this.connect(this.serverUrl);
    }
    
    // Track metrics
    this.metrics.reconnections++;
    
    // Return true to indicate reconnection attempt was initiated
    return true;
  }
  
  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.offlineMode) {
      return; // Don't try to reconnect in offline mode
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      this.notifyStateChange(false, { 
        maxAttemptsReached: true, 
        attempts: this.reconnectAttempts 
      });
      return;
    }
    
    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    console.log(`Reconnecting in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    // Notify of reconnection attempt
    this.notifyStateChange(false, { 
      reconnecting: true, 
      attempt: this.reconnectAttempts + 1, 
      delay: delay,
      maxAttempts: this.maxReconnectAttempts
    });
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect().then((success) => {
        if (!success && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      });
    }, delay);
  }
  
  /**
   * Start heartbeat mechanism to detect connection issues
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval
    
    // Reset failed pings counter when starting a new heartbeat
    this.consecutiveFailedPings = 0;
    
    // Set up interval for sending pings
    this.pingTimer = setInterval(() => {
      // Skip if offline mode is enabled
      if (this.offlineMode) {
        return;
      }
      
      // If we haven't received any messages in a while, send a ping
      const timeSinceLastMessage = Date.now() - this.lastMessageReceived;
      
      // Update connection health periodically
      this.updateConnectionHealth();
      
      if (timeSinceLastMessage > this.pingInterval) {
        this.sendPing();
      }
      
      // Also periodically save connection state for persistence
      if (this.enableSessionPersistence && Date.now() % 60000 < this.pingInterval) {
        this.saveConnectionState({
          connectionId: this.reconnectOptions?.connectionId,
          lastMessageId: this.lastMessageId,
          lastConnected: Date.now()
        });
      }
    }, this.pingInterval);
  }
  
  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  
  /**
   * Send a ping to the server to check connection
   */
  sendPing() {
    if (!this.isConnected || this.offlineMode) {
      return;
    }
    
    const pingData = {
      type: 'ping',
      timestamp: Date.now(),
      connectionId: this.reconnectOptions?.connectionId,
      lastMessageId: this.lastMessageId,
      clientId: this.getClientId(),
      connectionHealth: this.connectionHealth
    };
    
    this.lastPingSent = Date.now();
    
    this.send(pingData).then(() => {
      // Ping sent successfully, start timeout for pong
      setTimeout(() => {
        // If we haven't received a pong yet, the connection might be dead
        if (this.lastPingSent && Date.now() - this.lastPingSent > this.pingTimeout) {
          console.log('Ping timeout - connection might be dead');
          
          // Increment consecutive failed pings counter
          this.consecutiveFailedPings++;
          
          // Downgrade connection quality based on consecutive failures
          if (this.consecutiveFailedPings >= 3) {
            this.assessConnectionQuality('critical');
          } else if (this.consecutiveFailedPings >= 2) {
            this.assessConnectionQuality('poor');
          }
          
          // Update connection health
          this.connectionHealth = Math.max(this.connectionHealth - 15, 0);
          
          // Reset ping timestamp
          this.lastPingSent = null;
          
          // Try to reconnect if the connection seems dead and we've had multiple failures
          if (this.isConnected && this.consecutiveFailedPings >= 2) {
            console.log(`Attempting connection recovery after ${this.consecutiveFailedPings} ping timeouts`);
            this.performConnectionRecovery();
          }
        }
      }, this.pingTimeout);
    }).catch(error => {
      console.error('Error sending ping:', error);
      this.consecutiveFailedPings++;
    });
  }
  
  /**
   * Handle pong message from server
   */
  handlePong(message) {
    const now = Date.now();
    const latency = now - this.lastPingSent;
    
    // Reset consecutive failed pings on successful pong
    this.consecutiveFailedPings = 0;
    
    // Update metrics
    this.metrics.latency = latency;
    this.lastPingSent = null;
    
    // Assess connection quality based on latency
    if (latency < 200) {
      this.assessConnectionQuality('good');
    } else if (latency < 500) {
      this.assessConnectionQuality('poor');
    } else {
      this.assessConnectionQuality('critical');
    }
    
    // Add to connection history
    this.metrics.connectionHistory.push({
      event: 'pong',
      timestamp: now,
      latency: latency
    });
  }
  
  /**
   * Assess connection quality based on various factors
   */
  assessConnectionQuality(forcedQuality = null) {
    if (forcedQuality) {
      if (this.connectionQuality !== forcedQuality) {
        this.connectionQuality = forcedQuality;
        this.notifyStateChange(this.isConnected, { quality: this.connectionQuality });
      }
      return;
    }
    
    // If offline, quality is offline
    if (!navigator.onLine || this.offlineMode) {
      if (this.connectionQuality !== 'offline') {
        this.connectionQuality = 'offline';
        this.notifyStateChange(this.isConnected, { quality: this.connectionQuality });
      }
      return;
    }
    
    // Check based on latency, error rate, etc.
    const { latency, errors, messagesReceived } = this.metrics;
    let newQuality;
    
    if (latency > 1000 || errors > 5) {
      newQuality = 'critical';
    } else if (latency > 300 || errors > 2) {
      newQuality = 'poor';
    } else {
      newQuality = 'good';
    }
    
    // Only notify if quality changed
    if (this.connectionQuality !== newQuality) {
      this.connectionQuality = newQuality;
      this.notifyStateChange(this.isConnected, { quality: this.connectionQuality });
    }
  }
  
  /**
   * Detect network information
   */
  detectNetworkInfo() {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      if (connection) {
        this.networkType = connection.type;
        
        // Listen for connection changes
        connection.addEventListener('change', () => {
          const prevNetworkType = this.networkType;
          this.networkType = connection.type;
          
          console.log(`Network changed: ${prevNetworkType} -> ${this.networkType}`);
          
          // Update metrics
          this.metrics.connectionHistory.push({
            event: 'networkChange',
            timestamp: Date.now(),
            from: prevNetworkType,
            to: this.networkType
          });
          
          // React to network type changes
          this.handleNetworkChange(prevNetworkType, this.networkType);
        });
      }
    }
  }
  
  /**
   * Handle network type changes
   */
  handleNetworkChange(previousType, newType) {
    // Adjust ping interval based on network type
    switch (newType) {
      case 'wifi':
        this.pingInterval = 15000;
        break;
      case 'cellular':
        this.pingInterval = 30000; // Less frequent pings to save data
        break;
      default:
        this.pingInterval = 15000;
    }
    
    // If changing from offline to online, attempt reconnect
    if ((previousType === 'none' || !navigator.onLine) && newType !== 'none' && navigator.onLine) {
      this.handleOnline();
    }
    
    // If changing to offline, set offline status
    if (newType === 'none' || !navigator.onLine) {
      this.handleOffline();
    }
  }
  
  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Device is online');
    
    // Update metrics
    this.metrics.connectionHistory.push({
      event: 'deviceOnline',
      timestamp: Date.now()
    });
    
    // Only attempt reconnect if we were offline and offline mode is not enabled
    if (!this.isConnected && !this.offlineMode) {
      console.log('Attempting reconnection after device came online');
      
      // Give the network a moment to stabilize
      setTimeout(() => {
        this.reconnect();
      }, 1000);
    }
    
    // Reassess connection quality
    this.assessConnectionQuality();
  }
  
  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Device is offline');
    
    // Update metrics
    this.metrics.connectionHistory.push({
      event: 'deviceOffline',
      timestamp: Date.now()
    });
    
    // Update connection quality
    this.assessConnectionQuality('offline');
  }
  
  /**
   * Set offline mode
   */
  setOfflineMode(enabled) {
    this.offlineMode = enabled;
    
    if (enabled) {
      // If enabling offline mode, disconnect from server
      if (this.isConnected) {
        this.disconnect();
      }
      
      // Update connection quality
      this.assessConnectionQuality('offline');
      
      console.log('Offline mode enabled');
    } else {
      // If disabling offline mode, try to reconnect
      console.log('Offline mode disabled, attempting reconnection');
      
      // Check if device is online before attempting reconnection
      if (navigator.onLine) {
        this.reconnect();
      }
    }
    
    // Add to connection history
    this.metrics.connectionHistory.push({
      event: enabled ? 'offlineModeEnabled' : 'offlineModeDisabled',
      timestamp: Date.now()
    });
    
    // Notify listeners
    this.notifyStateChange(this.isConnected, { 
      offlineMode: this.offlineMode
    });
    
    return this.offlineMode;
  }
  
  /**
   * Send a message to the server
   */
  async send(data) {
    // If not connected or in offline mode, queue the message
    if (!this.isConnected || this.offlineMode) {
      return this.queueMessage(data);
    }
    
    try {
      const messageString = JSON.stringify(data);
      this.socket.send(messageString);
      
      // Update metrics
      this.metrics.messagesSent++;
      this.metrics.bytesSent += messageString.length;
      this.metrics.lastActivity = Date.now();
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.metrics.errors++;
      
      // Queue the message for retry
      this.queueMessage(data);
      
      return false;
    }
  }
  
  /**
   * Queue a message to be sent when connection is restored
   */
  queueMessage(data) {
    // Add to queue with metadata
    const queueItem = {
      data: data,
      timestamp: Date.now(),
      attempts: 0
    };
    
    this.messageQueue.push(queueItem);
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    // Notify listeners
    this.notifyStateChange(this.isConnected, { 
      queuedMessage: true,
      queueLength: this.messageQueue.length
    });
    
    return false;
  }
  
  /**
   * Process queued messages when connection is restored
   */
  processQueue() {
    if (!this.isConnected || this.offlineMode || this.messageQueue.length === 0) {
      return;
    }
    
    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    // Create a copy of the queue and clear original
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];
    
    // Process each message
    queueCopy.forEach(item => {
      this.send(item.data).catch(error => {
        console.error('Error sending queued message:', error);
      });
    });
    
    // Notify listeners
    this.notifyStateChange(this.isConnected, { 
      queueProcessed: true,
      processedCount: queueCopy.length
    });
  }
  
  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    // Handle pings/pongs internally
    if (message.type === 'pong') {
      this.handlePong(message);
      return;
    }
    
    // Forward message to appropriate handler
    const handler = this.messageHandlers[message.type];
    if (handler) {
      handler(message);
    } else {
      console.log('No handler for message type:', message.type);
    }
  }
  
  /**
   * Register a message handler
   */
  registerHandler(type, callback) {
    this.messageHandlers[type] = callback;
  }
  
  /**
   * Unregister a message handler
   */
  unregisterHandler(type) {
    delete this.messageHandlers[type];
  }
  
  /**
   * Add a connection state listener
   */
  addConnectionStateListener(callback) {
    this.connectionStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionStateListeners = this.connectionStateListeners.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify all connection state listeners
   */
  notifyStateChange(connected, details = {}) {
    this.connectionStateListeners.forEach(callback => {
      try {
        callback(connected, {
          ...details,
          quality: this.connectionQuality,
          offlineMode: this.offlineMode,
          reconnectAttempts: this.reconnectAttempts,
          queueLength: this.messageQueue.length,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }
  
  /**
   * Get connection status
   */
  isConnected() {
    return this.isConnected;
  }
  
  /**
   * Get connection quality
   */
  getConnectionQuality() {
    return this.connectionQuality;
  }
  
  /**
   * Get offline mode status
   */
  isOfflineMode() {
    return this.offlineMode;
  }
  
  /**
   * Get connection metrics
   */
  getConnectionMetrics() {
    // Calculate uptime
    this.metrics.uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    
    return {
      ...this.metrics,
      queueLength: this.messageQueue.length,
      isConnected: this.isConnected,
      connectionQuality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts,
      networkType: this.networkType
    };
  }
  
  /**
   * Get diagnostic info for debugging
   */
  getDiagnosticInfo() {
    return {
      isConnected: this.isConnected,
      connectionQuality: this.connectionQuality,
      offlineMode: this.offlineMode,
      reconnectAttempts: this.reconnectAttempts,
      metrics: this.getConnectionMetrics(),
      messageQueue: this.messageQueue.length,
      networkType: this.networkType,
      persistenceEnabled: this.enableSessionPersistence,
      connectionId: this.reconnectOptions?.connectionId,
      lastMessageId: this.lastMessageId,
      connectionHealth: this.connectionHealth,
      recoveryInProgress: this.recoveryInProgress,
      browserInfo: {
        userAgent: navigator.userAgent,
        onLine: navigator.onLine,
        language: navigator.language,
        doNotTrack: navigator.doNotTrack
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Monitor network changes for connection resilience
   */
  monitorNetworkChanges() {
    if (this.networkChangeHandler) {
      return; // Already monitoring
    }
    
    // Handler for connection changes
    this.networkChangeHandler = () => {
      if (navigator.onLine) {
        console.log('Network connection restored');
        // Attempt recovery if we're currently disconnected
        if (!this.isConnected && !this.recoveryInProgress) {
          this.performConnectionRecovery();
        }
      } else {
        console.log('Network connection lost');
        // We'll try to reconnect when the network comes back
        this.connectionQuality = 'critical';
        this.connectionHealth = Math.max(this.connectionHealth - 25, 0);
        
        // Notify listeners about the poor connection
        this.notifyStateChange(false, {
          quality: 'critical', 
          reason: 'Network unavailable',
          willRecover: true
        });
      }
    };
    
    // Listen for online/offline events
    window.addEventListener('online', this.networkChangeHandler);
    window.addEventListener('offline', this.networkChangeHandler);
  }
  
  /**
   * Stop monitoring network changes
   */
  stopNetworkMonitoring() {
    if (this.networkChangeHandler) {
      window.removeEventListener('online', this.networkChangeHandler);
      window.removeEventListener('offline', this.networkChangeHandler);
      this.networkChangeHandler = null;
    }
  }
  
  /**
   * Perform intelligent connection recovery
   */
  async performConnectionRecovery() {
    if (this.recoveryInProgress || this.offlineMode) {
      return;
    }
    
    this.recoveryInProgress = true;
    
    try {
      console.log('Starting connection recovery process...');
      // Notify about recovery attempt
      this.notifyStateChange(false, {
        quality: 'unknown',
        recoveryAttempt: true,
        recoveryInProgress: true
      });
      
      // Load saved connection state
      const savedState = this.loadConnectionState();
      
      // First, check if network is available
      if (!navigator.onLine) {
        console.log('Network unavailable, waiting for network...');
        // We'll retry when network comes back via the event listener
        return;
      }
      
      // Close existing socket if any
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {
          // Ignore errors on close
        }
        this.socket = null;
      }
      
      // Clear any existing timers
      if (this.connectionRecoveryTimer) {
        clearTimeout(this.connectionRecoveryTimer);
      }
      
      // Perform the reconnection
      const success = await this.reconnect();
      
      if (success) {
        console.log('Connection recovery successful');
        this.connectionHealth = Math.min(this.connectionHealth + 20, 100);
        this.recoveryInProgress = false;
        
        // If we have a saved connection ID, try to restore session
        if (savedState && savedState.connectionId) {
          // Send a session restore message to let the server know
          // this is the same client reconnecting
          this.sendMessage({
            type: 'session_restore',
            connectionId: savedState.connectionId,
            lastMessageId: savedState.lastMessageId || 0,
            clientId: this.getClientId()
          });
        }
      } else {
        console.log('Connection recovery failed, scheduling retry');
        this.connectionHealth = Math.max(this.connectionHealth - 10, 0);
        
        // Schedule another attempt with exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 60000);
        
        this.connectionRecoveryTimer = setTimeout(() => {
          this.recoveryInProgress = false;
          this.performConnectionRecovery();
        }, backoffTime);
      }
    } catch (error) {
      console.error('Error during connection recovery:', error);
      this.recoveryInProgress = false;
      
      // Schedule another attempt
      this.connectionRecoveryTimer = setTimeout(() => {
        this.performConnectionRecovery();
      }, 10000);
    }
  }
  
  /**
   * Calculate and update connection health score
   * Used for determining when to preemptively reconnect
   */
  updateConnectionHealth() {
    // Start with base score
    let health = this.connectionHealth;
    
    // Penalize for failed pings
    health -= this.consecutiveFailedPings * 10;
    
    // Penalize for high latency
    if (this.metrics.latency > 1000) {
      health -= 10;
    } else if (this.metrics.latency > 500) {
      health -= 5;
    }
    
    // Improve score for sustained connection
    if (this.isConnected && Date.now() - this.metrics.lastActivity < 30000) {
      health += 5;
    }
    
    // Cap between 0-100
    this.connectionHealth = Math.min(Math.max(health, 0), 100);
    
    // If health is very poor, consider preemptive reconnection
    if (this.isConnected && this.connectionHealth < 30 && !this.recoveryInProgress) {
      console.log('Connection health critical, performing preemptive reconnection');
      this.performConnectionRecovery();
    }
    
    return this.connectionHealth;
  }
  
  /**
   * Save connection state to localStorage for persistence
   * @param {Object} state - State object to save
   */
  saveConnectionState(state) {
    if (!this.enableSessionPersistence) return;
    
    try {
      const persistentState = {
        ...state,
        timestamp: Date.now(),
        url: this.serverUrl,
        deviceId: this.getClientId()
      };
      
      localStorage.setItem('quibish_ws_connection', JSON.stringify(persistentState));
      
      // Also save to session storage as backup
      sessionStorage.setItem('quibish_ws_connection', JSON.stringify(persistentState));
      
      if (this.debug) {
        console.log('Saved connection state:', persistentState);
      }
    } catch (error) {
      console.warn('Failed to save connection state:', error);
    }
  }
  
  /**
   * Load connection state from localStorage
   * @returns {Object|null} Saved connection state or null
   */
  loadConnectionState() {
    if (!this.enableSessionPersistence) return null;
    
    try {
      // Try localStorage first, then sessionStorage
      const savedState = localStorage.getItem('quibish_ws_connection') || 
                         sessionStorage.getItem('quibish_ws_connection');
      
      if (!savedState) return null;
      
      const parsedState = JSON.parse(savedState);
      
      // Only use state if it's relatively fresh (less than 7 days old)
      if (Date.now() - parsedState.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsedState;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load connection state:', error);
      return null;
    }
  }
  
  /**
   * Generate or retrieve persistent client ID
   */
  getClientId() {
    // Try to get existing client ID
    let clientId = localStorage.getItem('quibish_client_id');
    
    if (!clientId) {
      // Generate new client ID
      clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('quibish_client_id', clientId);
    }
    
    return clientId;
  }
  
  /**
   * Add connection parameters to URL for session resumption
   */
  addConnectionParams(url, params) {
    // Don't modify URL if persistence is disabled
    if (!this.enableSessionPersistence) return url;
    
    try {
      const urlObj = new URL(url);
      
      // Add params to URL
      Object.entries(params).forEach(([key, value]) => {
        if (value) urlObj.searchParams.append(key, value);
      });
      
      return urlObj.toString();
    } catch (error) {
      console.warn('Failed to add connection params to URL:', error);
      return url;
    }
  }
  
  /**
   * Start periodic updates to connection persistence data
   */
  startConnectionPersistence() {
    if (!this.enableSessionPersistence) return;
    
    // Clear any existing interval
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    
    // Update connection state every minute
    this.persistenceTimer = setInterval(() => {
      if (this.isConnected) {
        this.saveConnectionState({
          connectionId: this.reconnectOptions?.connectionId,
          lastConnected: Date.now(),
          lastMessageId: this.lastMessageId || 0,
          metrics: {
            uptime: this.metrics.uptime,
            messagesSent: this.metrics.messagesSent,
            messagesReceived: this.metrics.messagesReceived
          }
        });
      }
    }, 60000); // Save every minute
  }
}

export default new EnhancedWebSocketService();
