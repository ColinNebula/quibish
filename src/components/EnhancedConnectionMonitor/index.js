import React, { useState, useEffect, useRef } from 'react';
import enhancedWebSocketService from '../../services/enhancedWebSocketService';
import './EnhancedConnectionMonitor.css';
import './enhanced-connection.css';

/**
 * EnhancedConnectionMonitor component
 * 
 * Advanced connection status display with:
 * - Real-time connection quality monitoring
 * - Network type detection
 * - Detailed diagnostics
 * - Reconnection controls
 * - Performance metrics
 */
const EnhancedConnectionMonitor = ({ 
  expanded = false,
  onStatusChange = null,
  showControls = true
}) => {
  // State
  const [isConnected, setIsConnected] = useState(enhancedWebSocketService.isConnected());
  const [connectionQuality, setConnectionQuality] = useState(enhancedWebSocketService.getConnectionQuality());
  const [metrics, setMetrics] = useState(enhancedWebSocketService.getConnectionMetrics());
  const [offlineMode, setOfflineMode] = useState(enhancedWebSocketService.isOfflineMode());
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectProgress, setReconnectProgress] = useState(0);
  
  // Refs
  const reconnectTimerRef = useRef(null);
  const metricsIntervalRef = useRef(null);
  
  // Update metrics periodically with highly adaptive interval based on network conditions
  useEffect(() => {
    // Update metrics immediately
    updateMetrics();
    
    // Track consecutive errors to adjust polling behavior
    let consecutiveErrors = 0;
    let lastActivity = Date.now();
    let isForeground = true;
    
    // Determine optimal update frequency based on multiple factors
    const getUpdateInterval = () => {
      // Base intervals
      const DISCONNECTED_INTERVAL = 1000;  // 1s when disconnected
      const POOR_INTERVAL = 1500;          // 1.5s for poor connection
      const GOOD_INTERVAL = 3000;          // 3s for good connection
      const IDLE_INTERVAL = 5000;          // 5s when app is idle
      const BACKGROUND_INTERVAL = 15000;   // 15s when in background
      const ERROR_INTERVAL = 7000;         // 7s after consecutive errors
      
      // Battery saving - increase interval when battery is low
      const useBatterySaving = metrics.batterySaving || 
        (navigator.getBattery && navigator.getBattery().then(b => b.level < 0.2));
      
      // User activity - more frequent updates during active usage
      const idleTime = Date.now() - lastActivity;
      const isIdle = idleTime > 60000; // 1 minute of inactivity
      
      // Apply multipliers based on conditions
      let interval;
      
      if (!isConnected) {
        // More frequent when disconnected but backoff after errors
        interval = consecutiveErrors > 3 ? ERROR_INTERVAL : DISCONNECTED_INTERVAL;
      } else if (connectionQuality === 'poor' || connectionQuality === 'critical') {
        // More frequent for monitoring poor connections
        interval = POOR_INTERVAL;
      } else {
        // Standard good connection interval
        interval = GOOD_INTERVAL;
      }
      
      // Adjust for user activity and app visibility
      if (!isForeground) {
        interval = Math.max(interval, BACKGROUND_INTERVAL);
      } else if (isIdle) {
        interval = Math.max(interval, IDLE_INTERVAL);
      }
      
      // Apply battery saving multiplier if needed
      if (useBatterySaving) {
        interval *= 2;
      }
      
      return interval;
    };
    
    // Set up interval with highly adaptive timing
    const setupMetricsInterval = () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      
      metricsIntervalRef.current = setInterval(async () => {
        try {
          await updateMetrics();
          consecutiveErrors = 0; // Reset error counter on success
        } catch (err) {
          consecutiveErrors++;
          console.warn(`Error updating metrics (attempt ${consecutiveErrors}):`, err);
          
          // Adjust interval after persistent errors
          if (consecutiveErrors >= 3) {
            // Reset and create a new interval with adjusted timing
            setupMetricsInterval();
          }
        }
      }, getUpdateInterval());
    };
    
    // Track user activity
    const handleUserActivity = () => {
      lastActivity = Date.now();
    };
    
    // Track app visibility
    const handleVisibilityChange = () => {
      isForeground = document.visibilityState === 'visible';
      // Immediately refresh metrics when coming to foreground
      if (isForeground) {
        updateMetrics();
      }
      // Update the interval timing
      setupMetricsInterval();
    };
    
    // Initialize the metrics interval
    setupMetricsInterval();
    
    // Set up event listeners for adaptive polling
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for connection state changes
    const unsubscribe = enhancedWebSocketService.addConnectionStateListener((connected, details) => {
      handleConnectionStateChange(connected, details);
      // Reset the interval when connection state changes to adjust frequency
      consecutiveErrors = 0;
      setupMetricsInterval();
    });
    
    // Cleanup on unmount
    return () => {
      clearInterval(metricsIntervalRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }, []);
  
  // Handle connection state changes
  const handleConnectionStateChange = (connected, details) => {
    setIsConnected(connected);
    setConnectionQuality(details.quality);
    setOfflineMode(details.offlineMode);
    
    if (details.reconnecting) {
      setReconnecting(true);
      startReconnectTimer(details.delay);
    } else {
      setReconnecting(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    }
    
    // Call external handler if provided
    if (onStatusChange) {
      onStatusChange(connected, details);
    }
    
    // Update metrics
    updateMetrics();
  };
  
  // Start reconnect timer animation
  const startReconnectTimer = (delay) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    // Reset progress
    setReconnectProgress(0);
    
    // Animate progress
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / delay) * 100);
      setReconnectProgress(progress);
      
      if (progress < 100) {
        reconnectTimerRef.current = setTimeout(animate, 50);
      } else {
        reconnectTimerRef.current = null;
      }
    };
    
    animate();
  };
  
  // Update all metrics with network diagnostics
  const updateMetrics = async () => {
    // Get basic metrics
    const baseMetrics = enhancedWebSocketService.getConnectionMetrics();
    
    // Enhance with network information when available
    try {
      // Get network connection information when available
      if (navigator.connection) {
        const conn = navigator.connection;
        baseMetrics.networkInfo = {
          type: conn.effectiveType || conn.type || 'unknown',
          downlink: conn.downlink || null, // Mbps
          rtt: conn.rtt || null, // ms
          saveData: !!conn.saveData,
        };
      }
      
      // Check actual connection with a lightweight fetch if connected
      if (isConnected && !offlineMode) {
        try {
          const start = performance.now();
          // Use a tiny endpoint or a cached resource to minimize bandwidth
          const response = await fetch('/heartbeat.json', { 
            method: 'HEAD',
            cache: 'no-cache',
            headers: { 'X-Request-Type': 'connection-test' },
            signal: AbortSignal.timeout(3000) // Abort after 3s
          });
          
          if (response.ok) {
            const latency = performance.now() - start;
            baseMetrics.actualLatency = Math.round(latency);
            baseMetrics.lastSuccessfulCheck = new Date().toISOString();
            
            // Update connection quality based on actual network performance
            if (latency < 150) {
              baseMetrics.qualityFactor = 'excellent';
            } else if (latency < 300) {
              baseMetrics.qualityFactor = 'good';
            } else if (latency < 600) {
              baseMetrics.qualityFactor = 'moderate';
            } else {
              baseMetrics.qualityFactor = 'poor';
            }
          }
        } catch (err) {
          // Network request failed - might indicate connection issues
          baseMetrics.latencyCheckFailed = true;
          console.log('Network diagnostic check failed:', err.message);
        }
      }
      
      // Check device online status
      baseMetrics.deviceOnline = navigator.onLine !== false;
    } catch (err) {
      console.error('Error collecting extended metrics:', err);
    }
    
    // Update state with enhanced metrics
    setMetrics(baseMetrics);
    
    // Inform the service about our findings
    enhancedWebSocketService.updateNetworkDiagnostics(baseMetrics);
  };
  
  // Enhanced manual reconnect with smart progressive strategy and diagnostics
  const handleReconnect = async () => {
    try {
      setReconnecting(true);
      
      // Show reconnection in progress
      setMetrics(prev => ({
        ...prev,
        status: "Reconnecting...",
        statusDetails: "Initializing smart reconnection sequence"
      }));
      
      // Collect network diagnostics first
      const diagnostics = {};
      
      // Check device online status
      diagnostics.online = navigator.onLine !== false;
      
      // Check for network connection info
      if (navigator.connection) {
        diagnostics.connectionType = navigator.connection.effectiveType || navigator.connection.type || 'unknown';
        diagnostics.downlink = navigator.connection.downlink;
        diagnostics.rtt = navigator.connection.rtt;
        diagnostics.saveDataMode = !!navigator.connection.saveData;
      }
      
      // Log diagnostics for better troubleshooting
      console.log('Connection diagnostics before reconnection attempt:', diagnostics);
      
      if (!diagnostics.online) {
        setMetrics(prev => ({
          ...prev,
          status: "Offline",
          statusDetails: "Your device appears to be offline. Please check your network connection."
        }));
        
        // Offer offline mode if appropriate
        if (enhancedWebSocketService.hasPendingMessages()) {
          // Prompt user to switch to offline mode or retry
          setMetrics(prev => ({
            ...prev,
            statusDetails: "Device offline. Consider enabling offline mode to continue working."
          }));
        }
        
        // Short-circuit if definitely offline
        return false;
      }
      
      // Step 1: Fast reconnect attempt (lowest latency approach)
      setMetrics(prev => ({
        ...prev,
        statusDetails: "Attempting fast reconnection..."
      }));
      
      let success = await enhancedWebSocketService.reconnect({ 
        strategy: 'fast',
        timeout: 3000
      });
      
      // If fast reconnect worked, we're done
      if (success) {
        setMetrics(prev => ({
          ...prev,
          status: "Connected",
          statusDetails: "Fast reconnection successful!"
        }));
        return true;
      }
      
      // Step 2: Ping endpoint to check actual server availability
      setMetrics(prev => ({
        ...prev,
        statusDetails: "Checking server availability..."
      }));
      
      let serverReachable = false;
      try {
        const response = await fetch('/api/status', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        });
        serverReachable = response.ok;
      } catch (err) {
        console.log('Server status check failed:', err.message);
        serverReachable = false;
      }
      
      // Step 3: Protocol switching if server is reachable but WebSocket fails
      if (serverReachable) {
        setMetrics(prev => ({
          ...prev,
          statusDetails: "Server reachable. Trying alternative protocols..."
        }));
        
        // Try secure protocol if we were on insecure or vice versa
        success = await enhancedWebSocketService.reconnect({ 
          switchProtocol: true,
          fullReset: true,
          timeout: 5000
        });
        
        if (success) return true;
      }
      
      // Step 4: Full connection reset with longer timeout
      setMetrics(prev => ({
        ...prev,
        statusDetails: "Performing complete connection reset..."
      }));
      
      success = await enhancedWebSocketService.reconnect({ 
        fullReset: true,
        forceNewHandshake: true,
        timeout: 10000
      });
      
      if (success) return true;
      
      // Step 5: Final attempt with alternative endpoint if configured
      success = await enhancedWebSocketService.reconnect({ 
        useAlternativeEndpoint: true,
        timeout: 8000
      });
      
      // Final result handling
      if (success) {
        setMetrics(prev => ({
          ...prev,
          status: "Connected",
          statusDetails: "Connection restored successfully!"
        }));
        return true;
      } else {
        console.log('Smart reconnect failed after multiple strategies');
        setMetrics(prev => ({
          ...prev,
          status: "Reconnection Failed",
          statusDetails: serverReachable ? 
            "Server is reachable, but WebSocket connection could not be established. Try again later." : 
            "Could not connect to server. Please check your network connection and try again."
        }));
        return false;
      }
    } catch (error) {
      console.error('Error during smart reconnection:', error);
      setMetrics(prev => ({
        ...prev,
        status: "Reconnection Error",
        statusDetails: `Error: ${error.message || 'Unknown error'}`
      }));
      return false;
    } finally {
      setReconnecting(false);
      // Refresh metrics after reconnection attempt
      setTimeout(updateMetrics, 500);
    }
  };
  
  // Toggle offline mode
  const handleToggleOfflineMode = () => {
    const newOfflineMode = enhancedWebSocketService.setOfflineMode(!offlineMode);
    setOfflineMode(newOfflineMode);
  };
  
  // Setup network change detection and automatic adaptation
  useEffect(() => {
    // Handle network quality or type changes
    const handleNetworkChange = async () => {
      // Skip if in offline mode
      if (offlineMode) return;
      
      // Get current network info
      const networkInfo = {};
      
      if (navigator.connection) {
        const conn = navigator.connection;
        const newType = conn.effectiveType || conn.type;
        const newDownlink = conn.downlink;
        
        // Store current network info
        networkInfo.type = newType;
        networkInfo.downlink = newDownlink;
        networkInfo.rtt = conn.rtt;
        networkInfo.saveData = conn.saveData;
        
        console.log(`Network changed: ${newType}, downlink: ${newDownlink}Mbps`);
        
        // Update metrics with new network info
        await updateMetrics();
        
        // If connection is poor but we're online, try to optimize connection parameters
        if (isConnected && (newType === '2g' || newDownlink < 1)) {
          console.log('Poor network detected, optimizing connection parameters');
          enhancedWebSocketService.optimizeForLowBandwidth();
        } 
        // If connection suddenly improved and we have pending data, sync immediately
        else if (isConnected && newType === '4g' && enhancedWebSocketService.hasPendingMessages()) {
          console.log('Network improved, syncing pending messages');
          enhancedWebSocketService.syncPendingMessages();
        }
      } else {
        // Fallback to basic online/offline detection
        const isOnline = navigator.onLine !== false;
        networkInfo.online = isOnline;
        
        // If we've gone from offline to online, try reconnecting
        if (isOnline && !isConnected) {
          console.log('Device back online, attempting to reconnect');
          setTimeout(() => handleReconnect(), 1000);
        }
      }
      
      // Send network info to the service
      enhancedWebSocketService.updateNetworkInfo(networkInfo);
    };
    
    // Set up network change listeners
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleNetworkChange);
    }
    
    // Always listen for online/offline events
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    // Initial network check
    handleNetworkChange();
    
    return () => {
      // Clean up network change listeners
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleNetworkChange);
      }
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [isConnected, offlineMode]);
  
  // Get status indicator class based on connection quality
  const getStatusIndicatorClass = () => {
    if (!isConnected) return 'disconnected';
    
    switch (connectionQuality) {
      case 'good':
        return 'connected';
      case 'poor':
        return 'poor-connection';
      case 'critical':
        return 'critical-connection';
      case 'offline':
        return 'offline';
      default:
        return 'unknown';
    }
  };
  
  // Get status text based on connection state
  const getStatusText = () => {
    if (offlineMode) return 'Offline Mode';
    if (!isConnected) return 'Disconnected';
    
    switch (connectionQuality) {
      case 'good':
        return 'Connected';
      case 'poor':
        return 'Poor Connection';
      case 'critical':
        return 'Unstable Connection';
      default:
        return 'Unknown';
    }
  };
  
  // Format bytes to human readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format time in seconds to human readable format
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  return (
    <div className={`enhanced-connection-monitor ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header with status indicator */}
      <div 
        className="connection-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="connection-status-wrapper">
          <div className={`connection-indicator ${getStatusIndicatorClass()}`}>
            <div className="indicator-pulse"></div>
          </div>
          <div className="connection-status-text">
            <span className="status-label">{getStatusText()}</span>
            {metrics.queueLength > 0 && (
              <span className="queue-indicator">
                {metrics.queueLength} pending
              </span>
            )}
          </div>
        </div>
        
        <div className="connection-toggle">
          <span className="toggle-icon">
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="connection-details">
          {/* Connection Quality Visualization */}
          <div className="connection-quality-meter">
            <div className="quality-label">Connection Health</div>
            <div className="quality-bar-container">
              <div 
                className={`quality-bar ${getStatusIndicatorClass()}`}
                style={{ 
                  width: `${isConnected ? metrics.health || 0 : 0}%`,
                  transition: 'width 0.8s ease-in-out'
                }}
              ></div>
              <div className="quality-scale">
                <span>Critical</span>
                <span>Poor</span>
                <span>Good</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>

          {/* Network Info Banner */}
          {metrics.networkInfo && (
            <div className="network-info-banner">
              <div className="network-type">
                <span className="info-label">Network:</span>
                <span className="info-value">
                  {metrics.networkInfo.type === 'wifi' ? 'WiFi' : 
                   metrics.networkInfo.type === 'cellular' ? 'Cellular' :
                   metrics.networkInfo.type === '4g' ? '4G' :
                   metrics.networkInfo.type === '3g' ? '3G' :
                   metrics.networkInfo.type === '2g' ? '2G' :
                   metrics.networkInfo.type || 'Unknown'}
                </span>
              </div>
              {metrics.networkInfo.downlink && (
                <div className="network-speed">
                  <span className="info-label">Speed:</span>
                  <span className="info-value">{metrics.networkInfo.downlink} Mbps</span>
                </div>
              )}
              {metrics.actualLatency && (
                <div className="network-latency">
                  <span className="info-label">Latency:</span>
                  <span className="info-value">{metrics.actualLatency} ms</span>
                </div>
              )}
            </div>
          )}
          
          {/* Tabs */}
          <div className="connection-tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              Metrics
            </button>
            <button 
              className={`tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
              onClick={() => setActiveTab('diagnostics')}
            >
              Diagnostics
            </button>
          </div>
          
          {/* Tab content */}
          <div className="connection-tab-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="connection-overview">
                <div className="status-card">
                  <div className="status-header">
                    <h4>Connection Status</h4>
                    <div className={`status-badge ${getStatusIndicatorClass()}`}>
                      {getStatusText()}
                    </div>
                  </div>
                  
                  <div className="status-details">
                    <div className="status-item">
                      <span className="status-label">Network</span>
                      <span className="status-value">{metrics.networkType || 'Unknown'}</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Latency</span>
                      <span className="status-value">{metrics.latency}ms</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Uptime</span>
                      <span className="status-value">{formatTime(metrics.uptime)}</span>
                    </div>
                  </div>
                  
                  {/* Reconnection progress */}
                  {reconnecting && (
                    <div className="reconnect-progress-container">
                      <div 
                        className="reconnect-progress-bar"
                        style={{ width: `${reconnectProgress}%` }}
                      ></div>
                      <span className="reconnect-text">
                        Reconnecting...
                      </span>
                    </div>
                  )}
                  
                  {/* Controls */}
                  {showControls && (
                    <div className="connection-controls">
                      <button 
                        className="reconnect-button"
                        onClick={handleReconnect}
                        disabled={reconnecting || offlineMode}
                      >
                        {reconnecting ? 'Reconnecting...' : 'Reconnect'}
                      </button>
                      
                      <button 
                        className={`offline-toggle ${offlineMode ? 'active' : ''}`}
                        onClick={handleToggleOfflineMode}
                      >
                        {offlineMode ? 'Go Online' : 'Go Offline'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="activity-summary">
                  <div className="activity-item">
                    <span className="activity-icon">📤</span>
                    <div className="activity-details">
                      <span className="activity-count">{metrics.messagesSent}</span>
                      <span className="activity-label">Sent</span>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <span className="activity-icon">📥</span>
                    <div className="activity-details">
                      <span className="activity-count">{metrics.messagesReceived}</span>
                      <span className="activity-label">Received</span>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <span className="activity-icon">🔄</span>
                    <div className="activity-details">
                      <span className="activity-count">{metrics.reconnections}</span>
                      <span className="activity-label">Reconnects</span>
                    </div>
                  </div>
                  
                  <div className="activity-item">
                    <span className="activity-icon">⚠️</span>
                    <div className="activity-details">
                      <span className="activity-count">{metrics.errors}</span>
                      <span className="activity-label">Errors</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className="connection-metrics">
                <div className="metrics-section">
                  <h4>Performance</h4>
                  
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <span className="metric-label">Latency</span>
                      <span className="metric-value">{metrics.latency}ms</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Uptime</span>
                      <span className="metric-value">{formatTime(metrics.uptime)}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Messages Sent</span>
                      <span className="metric-value">{metrics.messagesSent}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Messages Received</span>
                      <span className="metric-value">{metrics.messagesReceived}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Bytes Sent</span>
                      <span className="metric-value">{formatBytes(metrics.bytesSent)}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Bytes Received</span>
                      <span className="metric-value">{formatBytes(metrics.bytesReceived)}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Reconnections</span>
                      <span className="metric-value">{metrics.reconnections}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Errors</span>
                      <span className="metric-value">{metrics.errors}</span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Last Activity</span>
                      <span className="metric-value">
                        {new Date(metrics.lastActivity).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="metric-item">
                      <span className="metric-label">Network Type</span>
                      <span className="metric-value">
                        {metrics.networkType || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="connection-history">
                  <h4>Recent Connection Events</h4>
                  
                  <div className="history-list">
                    {(metrics.connectionHistory || []).slice(-5).reverse().map((event, index) => (
                      <div key={index} className="history-item">
                        <span className="history-time">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="history-event">
                          {event.event}
                        </span>
                        <span className="history-details">
                          {event.latency ? `${event.latency}ms` : ''}
                          {event.code ? `Code: ${event.code}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Diagnostics Tab */}
            {activeTab === 'diagnostics' && (
              <div className="connection-diagnostics">
                <div className="diagnostics-header">
                  <h4>Connection Diagnostics</h4>
                  <button 
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="toggle-diagnostics"
                  >
                    {showDiagnostics ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                
                <div className="diagnostics-content">
                  {/* Quick diagnostics summary */}
                  <div className="diagnostics-summary">
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">Connection State</span>
                      <span className={`diagnostic-value ${isConnected ? 'good' : 'bad'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">Quality</span>
                      <span className={`diagnostic-value ${connectionQuality}`}>
                        {connectionQuality}
                      </span>
                    </div>
                    
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">Network</span>
                      <span className="diagnostic-value">
                        {metrics.networkType || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">Browser Online</span>
                      <span className={`diagnostic-value ${navigator.onLine ? 'good' : 'bad'}`}>
                        {navigator.onLine ? 'Yes' : 'No'}
                      </span>
                    </div>
                    
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">Queued Messages</span>
                      <span className={`diagnostic-value ${metrics.queueLength > 0 ? 'warning' : 'good'}`}>
                        {metrics.queueLength}
                      </span>
                    </div>
                  </div>
                  
                  {/* Detailed diagnostics info */}
                  {showDiagnostics && (
                    <div className="detailed-diagnostics">
                      <pre className="diagnostics-json">
                        {JSON.stringify(enhancedWebSocketService.getDiagnosticInfo(), null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {/* Self-diagnostics tools */}
                  <div className="diagnostics-tools">
                    <h5>Diagnostic Tools</h5>
                    
                    <div className="tools-buttons">
                      <button 
                        onClick={handleReconnect}
                        disabled={reconnecting || offlineMode}
                      >
                        Test Reconnection
                      </button>
                      
                      <button onClick={() => enhancedWebSocketService.sendPing()}>
                        Send Ping
                      </button>
                      
                      <button onClick={() => console.log(enhancedWebSocketService.getDiagnosticInfo())}>
                        Log Diagnostics
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedConnectionMonitor;
