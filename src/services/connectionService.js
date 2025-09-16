// Connection Service - Complete Implementation
class ConnectionService {
  constructor() {
    this.isConnected = navigator.onLine;
    this.connectionType = 'unknown';
    this.lastConnectionCheck = Date.now();
    this.connectionHistory = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.websocket = null;
    this.eventListeners = new Map();
  }

  // Initialize connection monitoring
  async connect(options = {}) {
    try {
      const { autoReconnect = true, websocketUrl = null } = options;
      
      // Monitor network status
      this.setupNetworkMonitoring();
      
      // Establish WebSocket connection if URL provided
      if (websocketUrl) {
        await this.connectWebSocket(websocketUrl);
      }
      
      // Check connection quality
      const quality = await this.checkConnectionQuality();
      
      this.connectionHistory.push({
        timestamp: new Date(),
        status: 'connected',
        quality,
        type: this.connectionType
      });
      
      return {
        connected: true,
        quality,
        type: this.connectionType,
        websocketConnected: !!this.websocket
      };
    } catch (error) {
      console.error('Connection failed:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // Disconnect all connections
  async disconnect() {
    try {
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      
      this.removeNetworkMonitoring();
      
      this.connectionHistory.push({
        timestamp: new Date(),
        status: 'disconnected',
        manual: true
      });
      
      return { success: true };
    } catch (error) {
      console.error('Disconnect error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current connection status
  getStatus() {
    return {
      connected: this.isConnected,
      type: this.connectionType,
      lastCheck: this.lastConnectionCheck,
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Check connection quality
  async checkConnectionQuality() {
    try {
      const startTime = Date.now();
      
      // Simple ping test
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const latency = Date.now() - startTime;
      
      let quality = 'excellent';
      if (latency > 1000) quality = 'poor';
      else if (latency > 500) quality = 'fair';
      else if (latency > 200) quality = 'good';
      
      return {
        latency,
        quality,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        latency: -1,
        quality: 'offline',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Setup network monitoring
  setupNetworkMonitoring() {
    const handleOnline = () => {
      this.isConnected = true;
      this.connectionType = this.getConnectionType();
      this.emit('online', { timestamp: new Date() });
      
      if (this.reconnectAttempts > 0) {
        this.reconnectAttempts = 0;
        this.emit('reconnected', { attempts: this.reconnectAttempts });
      }
    };
    
    const handleOffline = () => {
      this.isConnected = false;
      this.emit('offline', { timestamp: new Date() });
      this.attemptReconnect();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Store references for cleanup
    this.networkHandlers = { handleOnline, handleOffline };
  }

  // Remove network monitoring
  removeNetworkMonitoring() {
    if (this.networkHandlers) {
      window.removeEventListener('online', this.networkHandlers.handleOnline);
      window.removeEventListener('offline', this.networkHandlers.handleOffline);
    }
  }

  // Attempt to reconnect
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
      return;
    }
    
    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });
    
    // Wait before retrying
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(async () => {
      try {
        const result = await this.connect();
        if (result.connected) {
          this.reconnectAttempts = 0;
          this.emit('reconnected', { attempts: this.reconnectAttempts });
        } else {
          this.attemptReconnect();
        }
      } catch (error) {
        this.attemptReconnect();
      }
    }, delay);
  }

  // Connect WebSocket
  async connectWebSocket(url) {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);
        
        this.websocket.onopen = () => {
          this.emit('websocketConnected', { url });
          resolve();
        };
        
        this.websocket.onerror = (error) => {
          this.emit('websocketError', { error });
          reject(error);
        };
        
        this.websocket.onclose = () => {
          this.emit('websocketDisconnected', {});
        };
        
        this.websocket.onmessage = (event) => {
          this.emit('websocketMessage', { data: event.data });
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get connection type
  getConnectionType() {
    if ('connection' in navigator) {
      return navigator.connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners?.indexOf?.(callback) ?? -1;
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get connection history
  getConnectionHistory() {
    return this.connectionHistory;
  }
}

export default new ConnectionService();