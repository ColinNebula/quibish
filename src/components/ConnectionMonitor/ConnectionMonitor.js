import React, { useState, useEffect } from 'react';
import { messageService } from '../../services/apiClient';
import './ConnectionMonitor.css';

/**
 * ConnectionMonitor component
 * Displays real-time connection status and metrics
 */
const ConnectionMonitor = ({ expanded = false }) => {
  const [isConnected, setIsConnected] = useState(messageService.isConnected());
  const [connectionQuality, setConnectionQuality] = useState(messageService.getConnectionQuality());
  const [metrics, setMetrics] = useState(messageService.getConnectionMetrics());
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Update connection metrics periodically
  useEffect(() => {
    // Update metrics immediately
    updateMetrics();
    
    // Set up interval to update metrics
    const interval = setInterval(() => {
      updateMetrics();
    }, 5000); // Update every 5 seconds
    
    // Listen for connection state changes
    const unsubscribe = messageService.addConnectionStateListener((connected, details) => {
      setIsConnected(connected);
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
    setConnectionQuality(messageService.getConnectionQuality());
    setMetrics(messageService.getConnectionMetrics());
    setLastUpdate(Date.now());
  };
  
  // Handle manual reconnect
  const handleReconnect = async () => {
    try {
      await messageService.reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };
  
  // Get CSS class for connection status
  const getStatusClass = () => {
    if (!isConnected) return 'status-offline';
    
    switch (connectionQuality) {
      case 'excellent': return 'status-excellent';
      case 'good': return 'status-good';
      case 'poor': return 'status-poor';
      case 'critical': return 'status-critical';
      default: return 'status-offline';
    }
  };
  
  // Get readable status text
  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    return connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1);
  };
  
  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className={`connection-monitor ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="connection-monitor-header" onClick={toggleExpanded}>
        <div className={`connection-status ${getStatusClass()}`}>
          <span className="status-dot"></span>
          <span className="status-text">{getStatusText()}</span>
        </div>
        <button 
          className="reconnect-button" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleReconnect(); 
          }}
          disabled={isConnected && connectionQuality !== 'critical'}
        >
          <span className="reconnect-icon">⟳</span>
        </button>
      </div>
      
      {isExpanded && (
        <div className="connection-details">
          <div className="metrics-row">
            <div className="metric">
              <span className="metric-label">Latency:</span>
              <span className="metric-value">{metrics.latency}ms</span>
            </div>
            <div className="metric">
              <span className="metric-label">Stability:</span>
              <span className="metric-value">{Math.round(metrics.stability)}%</span>
            </div>
          </div>
          
          {metrics.disconnects > 0 && (
            <div className="metrics-row">
              <div className="metric">
                <span className="metric-label">Disconnects:</span>
                <span className="metric-value">{metrics.disconnects}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Reconnect attempts:</span>
                <span className="metric-value">{metrics.reconnectAttempts}</span>
              </div>
            </div>
          )}
          
          <div className="connection-history">
            {metrics.pingHistory && metrics.pingHistory.length > 0 && (
              <div className="ping-history">
                {metrics.pingHistory.map((ping, index) => (
                  <div 
                    key={index}
                    className="ping-bar"
                    style={{ height: `${Math.min(100, ping / 10)}%` }}
                    title={`${ping}ms`}
                  ></div>
                ))}
              </div>
            )}
          </div>
          
          <div className="metrics-footer">
            Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionMonitor;
