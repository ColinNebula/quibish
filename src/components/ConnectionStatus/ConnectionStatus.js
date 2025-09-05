// Connection Status Component
import React from 'react';
import { useConnectionStatus } from '../../services/EnhancedConnectionManager';
import './ConnectionStatus.css';

const ConnectionStatus = ({ compact = false }) => {
  const { 
    isOnline, 
    backendConnected, 
    reconnectAttempts, 
    maxReconnectAttempts,
    isReconnecting,
    lastHealthCheck,
    forceCheck,
    resetReconnect 
  } = useConnectionStatus();

  const getStatusColor = () => {
    if (!isOnline) return '#ef4444'; // Red - no internet
    if (!backendConnected && isReconnecting) return '#f59e0b'; // Orange - reconnecting
    if (!backendConnected) return '#ef4444'; // Red - backend down
    return '#10b981'; // Green - all good
  };

  const getStatusText = () => {
    if (!isOnline) return 'No Internet';
    if (!backendConnected && isReconnecting) return `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
    if (!backendConnected) return 'Server Offline';
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '🔌';
    if (!backendConnected && isReconnecting) return '🔄';
    if (!backendConnected) return '❌';
    return '✅';
  };

  if (compact) {
    return (
      <div className="connection-status-compact" style={{ color: getStatusColor() }}>
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className="connection-status-card">
      <div className="status-header">
        <span className="status-icon" style={{ color: getStatusColor() }}>
          {getStatusIcon()}
        </span>
        <span className="status-title">Connection Status</span>
      </div>
      
      <div className="status-details">
        <div className="status-item">
          <span className="status-label">Internet:</span>
          <span className={`status-value ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Backend:</span>
          <span className={`status-value ${backendConnected ? 'connected' : 'disconnected'}`}>
            {backendConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {isReconnecting && (
          <div className="status-item">
            <span className="status-label">Reconnecting:</span>
            <span className="status-value reconnecting">
              Attempt {reconnectAttempts}/{maxReconnectAttempts}
            </span>
          </div>
        )}
        
        {lastHealthCheck && (
          <div className="status-item">
            <span className="status-label">Last Check:</span>
            <span className="status-value">
              {lastHealthCheck.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
      
      <div className="status-actions">
        <button 
          className="status-button primary"
          onClick={forceCheck}
          disabled={isReconnecting}
        >
          Check Now
        </button>
        
        {reconnectAttempts > 0 && (
          <button 
            className="status-button secondary"
            onClick={resetReconnect}
          >
            Reset & Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;