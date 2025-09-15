import React, { useState, useEffect } from 'react';
import './ConnectionIndicator.css';

const ConnectionIndicator = ({ quality, isConnected }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    latency: '45ms',
    packetLoss: '0.2%',
    dataTransferred: '12.4MB',
    uptime: '2h 34m'
  });

  // Simulate changing network conditions
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        const randomLatency = Math.floor(Math.random() * 200) + 20;
        const randomPacketLoss = (Math.random() * 2).toFixed(1);
        
        setConnectionStats(prev => ({
          ...prev,
          latency: `${randomLatency}ms`,
          packetLoss: `${randomPacketLoss}%`
        }));
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isConnected]);

  // Get text and class based on connection quality
  const getConnectionInfo = () => {
    if (!isConnected) {
      return { text: "Offline", className: "connection-offline" };
    }
    
    switch(quality) {
      case "excellent":
        return { text: "Excellent", className: "connection-excellent" };
      case "good":
        return { text: "Good", className: "connection-good" };
      case "fair":
        return { text: "Fair", className: "connection-fair" };
      case "poor":
        return { text: "Poor", className: "connection-poor" };
      default:
        return { text: "Unknown", className: "connection-offline" };
    }
  };
  
  const { text, className } = getConnectionInfo();
  
  return (
    <div className={`connection-indicator ${className}`}>
      <div className="connection-status"></div>
      <span className="connection-label">{text}</span>
      
      <div className="connection-tooltip">
        <h4>Connection Details</h4>
        <p>{isConnected ? "You are connected to the server" : "You are currently offline"}</p>
        
        <div className="connection-stats">
          <div className="connection-stat">
            <span className="stat-label">Latency</span>
            <span className="stat-value">{connectionStats.latency}</span>
          </div>
          <div className="connection-stat">
            <span className="stat-label">Packet Loss</span>
            <span className="stat-value">{connectionStats.packetLoss}</span>
          </div>
          <div className="connection-stat">
            <span className="stat-label">Data Transferred</span>
            <span className="stat-value">{connectionStats.dataTransferred}</span>
          </div>
          <div className="connection-stat">
            <span className="stat-label">Uptime</span>
            <span className="stat-value">{connectionStats.uptime}</span>
          </div>
        </div>
        
        {!isConnected && (
          <button className="reconnect-button">
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionIndicator;
