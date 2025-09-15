// Enhanced Connection Manager with Auto-Recovery
import { useState, useEffect, useCallback } from 'react';

class EnhancedConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.backendConnected = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.listeners = [];
    this.healthChecksEnabled = false; // Temporarily disabled to fix rate limiting
    
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Temporarily disable health checking to avoid rate limiting issues
    console.log('⚠️ Health checks temporarily disabled to fix rate limiting');
    this.backendConnected = true; // Assume connected for now
    this.notifyListeners();
    
    // TODO: Re-enable after fixing backend rate limiting
    // this.startHealthCheck();
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          isOnline: this.isOnline,
          backendConnected: this.backendConnected,
          reconnectAttempts: this.reconnectAttempts,
          lastHealthCheck: this.lastHealthCheck
        });
      } catch (error) {
        console.error('Error notifying connection listener:', error);
      }
    });
  }

  handleOnline() {
    console.log('🌐 Network connection restored');
    this.isOnline = true;
    // Temporarily disabled: this.startHealthCheck();
    this.backendConnected = true; // Assume connected for now
    this.notifyListeners();
  }

  handleOffline() {
    console.log('🔌 Network connection lost');
    this.isOnline = false;
    this.backendConnected = false;
    this.stopHealthCheck();
    this.notifyListeners();
  }

  async checkBackendHealth() {
    if (!this.healthChecksEnabled) {
      console.log('⚠️ Health checks are temporarily disabled');
      this.backendConnected = true; // Assume connected for now
      return true;
    }
    
    if (!this.isOnline) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:5001/api/ping', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await response.json(); // Parse response but don't store unused data
        this.lastHealthCheck = new Date();
        
        if (!this.backendConnected) {
          console.log('✅ Backend connection restored');
          this.backendConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000; // Reset delay
        }
        
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (this.backendConnected || this.reconnectAttempts === 0) {
        console.log('❌ Backend connection lost:', error.message);
      }
      
      this.backendConnected = false;
      this.scheduleReconnect();
      return false;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`🔄 Max reconnection attempts reached (${this.maxReconnectAttempts}). Will retry when network status changes.`);
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) + jitter, 30000);
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
    
    setTimeout(() => {
      if (this.isOnline) {
        this.checkBackendHealth().then(() => this.notifyListeners());
      }
    }, delay);
  }

  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Initial check
    this.checkBackendHealth().then(() => this.notifyListeners());

    // Regular health checks every 2 minutes to avoid rate limiting
    this.healthCheckInterval = setInterval(async () => {
      await this.checkBackendHealth();
      this.notifyListeners();
    }, 120000); // 2 minutes
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      backendConnected: this.backendConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastHealthCheck: this.lastHealthCheck,
      isReconnecting: this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts
    };
  }

  // Force a connection check
  async forceCheck() {
    console.log('🔍 Forcing connection check...');
    await this.checkBackendHealth();
    this.notifyListeners();
  }

  // Reset reconnection attempts (useful when user manually triggers reconnect)
  resetReconnectAttempts() {
    console.log('🔄 Resetting reconnection attempts');
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.stopHealthCheck();
    this.listeners = [];
  }
}

// Singleton instance
let connectionManagerInstance = null;

export const getConnectionManager = () => {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new EnhancedConnectionManager();
  }
  return connectionManagerInstance;
};

// React hook for connection status
export const useConnectionStatus = () => {
  const [status, setStatus] = useState(() => getConnectionManager().getStatus());

  useEffect(() => {
    const manager = getConnectionManager();
    const unsubscribe = manager.addListener(setStatus);
    
    // Get initial status
    setStatus(manager.getStatus());
    
    return unsubscribe;
  }, []);

  const forceCheck = useCallback(() => {
    getConnectionManager().forceCheck();
  }, []);

  const resetReconnect = useCallback(() => {
    getConnectionManager().resetReconnectAttempts();
    getConnectionManager().forceCheck();
  }, []);

  return {
    ...status,
    forceCheck,
    resetReconnect
  };
};

export default EnhancedConnectionManager;