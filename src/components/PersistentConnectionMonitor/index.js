import React, { useState, useEffect } from 'react';
import enhancedWebSocketService from '../../services/enhancedWebSocketService';
import './styles.css';

/**
 * PersistentConnectionMonitor component
 * Displays detailed information about the persistent WebSocket connection
 */
const PersistentConnectionMonitor = ({ expanded = false }) => {
  const [isConnected, setIsConnected] = useState(enhancedWebSocketService.isConnected);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [metrics, setMetrics] = useState({});
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [connectionState, setConnectionState] = useState({});
  const [persistenceEnabled, setPersistenceEnabled] = useState(true);
  
  // Update connection metrics periodically
  useEffect(() => {
    // Update metrics immediately
    updateMetrics();
    
    // Set up interval to update metrics
    const interval = setInterval(() => {
      updateMetrics();
    }, 3000); // Update every 3 seconds
    
    // Listen for connection state changes
    const unsubscribe = enhancedWebSocketService.addConnectionStateListener((connected, details) => {
      setIsConnected(connected);
      setConnectionQuality(details.quality || 'unknown');
      updateMetrics();
      
      // If connection state changes, update immediately
      setLastUpdate(Date.now());
    });
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);
  
  // Update all metrics
  const updateMetrics = () => {
    const diagnosticInfo = enhancedWebSocketService.getDiagnosticInfo();
    setMetrics(diagnosticInfo.metrics || {});
    setConnectionState(diagnosticInfo);
    setPersistenceEnabled(diagnosticInfo.persistenceEnabled || false);
    setLastUpdate(Date.now());
  };
  
  // Handle manual reconnect
  const handleReconnect = async () => {
    await enhancedWebSocketService.reconnect();
    updateMetrics();
  };
  
  // Format connection time
  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  // Format byte size
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  // Format timestamp to local time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Copy connection ID to clipboard
  const copyConnectionId = () => {
    if (connectionState.connectionId) {
      navigator.clipboard.writeText(connectionState.connectionId)
        .then(() => {
          alert('Connection ID copied to clipboard');
        })
        .catch(() => {
          alert('Failed to copy. Connection ID: ' + connectionState.connectionId);
        });
    }
  };
  
  // Handle toggling offline mode
  const toggleOfflineMode = () => {
    enhancedWebSocketService.setOfflineMode(!connectionState.offlineMode);
    updateMetrics();
  };

  return (
    <div className={`persistent-connection-monitor ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="connection-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`connection-indicator ${isConnected ? connectionQuality : 'disconnected'}`}></div>
        <div className="connection-title">
          {isConnected ? (
            <span>
              {connectionQuality === 'good' ? 'Persistent Connection' : 
               connectionQuality === 'poor' ? 'Poor Connection' : 'Unstable Connection'}
            </span>
          ) : (
            <span>Disconnected {connectionState.reconnectAttempts > 0 ? `(Retry #${connectionState.reconnectAttempts})` : ''}</span>
          )}
        </div>
        <div className="connection-toggle">
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="connection-details">
          <div className="connection-metrics">
            <div className="metric-group">
              <div className="metric-row">
                <span className="metric-label">Status:</span>
                <span className={`metric-value status-${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Persistence:</span>
                <span className={`metric-value status-${persistenceEnabled ? 'enabled' : 'disabled'}`}>
                  {persistenceEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              
              {connectionState.connectionId && (
                <div className="metric-row">
                  <span className="metric-label">Connection ID:</span>
                  <span className="metric-value connection-id" onClick={copyConnectionId} title="Click to copy">
                    {connectionState.connectionId.substring(0, 8)}...
                    <span className="copy-icon">📋</span>
                  </span>
                </div>
              )}
              
              <div className="metric-row">
                <span className="metric-label">Quality:</span>
                <span className={`metric-value quality-${connectionQuality}`}>
                  {connectionQuality === 'good' ? 'Good' : 
                   connectionQuality === 'poor' ? 'Poor' : 
                   connectionQuality === 'critical' ? 'Critical' : 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="metric-group">
              <div className="metric-row">
                <span className="metric-label">Uptime:</span>
                <span className="metric-value">{formatUptime(metrics.uptime)}</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Last Message:</span>
                <span className="metric-value">{metrics.lastActivity ? formatTimestamp(metrics.lastActivity) : 'None'}</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Network:</span>
                <span className="metric-value">{connectionState.networkType || 'Unknown'}</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Last Message ID:</span>
                <span className="metric-value">{connectionState.lastMessageId || '0'}</span>
              </div>
            </div>
            
            <div className="metric-group">
              <div className="metric-row">
                <span className="metric-label">Messages Sent:</span>
                <span className="metric-value">{metrics.messagesSent || 0}</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Messages Received:</span>
                <span className="metric-value">{metrics.messagesReceived || 0}</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Data Sent:</span>
                <span className="metric-value">{formatBytes(metrics.bytesSent)}</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">Data Received:</span>
                <span className="metric-value">{formatBytes(metrics.bytesReceived)}</span>
              </div>
            </div>
          </div>
          
          <div className="connection-actions">
            <button 
              onClick={handleReconnect} 
              disabled={isConnected && connectionQuality === 'good'}
              className="reconnect-button"
            >
              {isConnected ? 'Force Reconnect' : 'Reconnect Now'}
            </button>
            
            <button 
              onClick={toggleOfflineMode} 
              className={`offline-toggle ${connectionState.offlineMode ? 'active' : ''}`}
            >
              {connectionState.offlineMode ? 'Exit Offline Mode' : 'Enter Offline Mode'}
            </button>
          </div>
          
          <div className="connection-footer">
            <span className="update-time">Last updated: {formatTimestamp(lastUpdate)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersistentConnectionMonitor;
