import React, { useState, useEffect, useCallback, useRef } from 'react';
import wifiService from '../../services/wifiService';
import './WiFiManager.css';

const WiFiManager = ({ isConnected, onConnectionChange }) => {
  // Additional state for enhanced features
  const [speedTestResults, setSpeedTestResults] = useState(null);
  const [isRunningSpeedTest, setIsRunningSpeedTest] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // WiFi state management
  const [isWiFiEnabled, setIsWiFiEnabled] = useState(true);
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showNetworkList, setShowNetworkList] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [networkPassword, setNetworkPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [wifiDiagnostics, setWifiDiagnostics] = useState({
    signalStrength: 0,
    linkSpeed: 0,
    frequency: 0,
    channel: 0,
    security: 'none'
  });

  // Network monitoring refs
  const scanIntervalRef = useRef(null);
  const connectionCheckRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const diagnosticsRef = useRef(null);

  // Simulated WiFi networks (since browsers can't access real WiFi scanning)
  // eslint-disable-next-line no-unused-vars
  const simulatedNetworks = [
    {
      ssid: 'Home_Network_5G',
      bssid: '00:11:22:33:44:55',
      security: 'WPA2',
      signalStrength: 85,
      frequency: 5180,
      channel: 36,
      isConnected: false,
      isSecure: true
    },
    {
      ssid: 'Home_Network_2.4G',
      bssid: '00:11:22:33:44:56',
      security: 'WPA2',
      signalStrength: 92,
      frequency: 2437,
      channel: 6,
      isConnected: true,
      isSecure: true
    },
    {
      ssid: 'Guest_WiFi',
      bssid: '00:11:22:33:44:57',
      security: 'Open',
      signalStrength: 78,
      frequency: 2412,
      channel: 1,
      isConnected: false,
      isSecure: false
    },
    {
      ssid: 'Neighbor_Network',
      bssid: 'aa:bb:cc:dd:ee:ff',
      security: 'WPA3',
      signalStrength: 45,
      frequency: 5240,
      channel: 48,
      isConnected: false,
      isSecure: true
    },
    {
      ssid: 'Office_WiFi',
      bssid: '11:22:33:44:55:66',
      security: 'WPA2-Enterprise',
      signalStrength: 65,
      frequency: 2462,
      channel: 11,
      isConnected: false,
      isSecure: true
    }
  ];

  // Enhanced network detection using real browser APIs where available
  // eslint-disable-next-line no-unused-vars
  const detectRealNetworkInfo = useCallback(async () => {
    const networkInfo = {
      hasRealConnection: false,
      estimatedSignal: 0,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    };

    try {
      // Use Network Information API if available
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
          networkInfo.hasRealConnection = true;
          networkInfo.connectionType = connection.type || 'unknown';
          networkInfo.effectiveType = connection.effectiveType || 'unknown';
          networkInfo.downlink = connection.downlink || 0;
          networkInfo.rtt = connection.rtt || 0;
          
          // Estimate signal strength based on connection quality
          if (connection.effectiveType === '4g' && connection.downlink > 10) {
            networkInfo.estimatedSignal = 90;
          } else if (connection.effectiveType === '4g') {
            networkInfo.estimatedSignal = 75;
          } else if (connection.effectiveType === '3g') {
            networkInfo.estimatedSignal = 60;
          } else if (connection.effectiveType === '2g') {
            networkInfo.estimatedSignal = 40;
          } else {
            networkInfo.estimatedSignal = 50;
          }
        }
      }

      // Use geolocation for WiFi positioning (if permission granted)
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 60000
            });
          });
          
          // If we have high accuracy positioning, likely connected to WiFi
          if (position.coords.accuracy < 100) {
            networkInfo.estimatedSignal = Math.max(networkInfo.estimatedSignal, 80);
          }
        } catch (error) {
          console.debug('Geolocation not available for network detection');
        }
      }

      // Performance-based network quality estimation
      if ('performance' in window && performance.timing) {
        const timing = performance.timing;
        const networkLatency = timing.responseStart - timing.fetchStart;
        
        if (networkLatency > 0 && networkLatency < 100) {
          networkInfo.estimatedSignal = Math.max(networkInfo.estimatedSignal, 85);
        }
      }

    } catch (error) {
      console.warn('Real network detection error:', error);
    }

    return networkInfo;
  }, []);

  // Enhanced WiFi scanning that combines real data with simulation
  const performWiFiScan = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Use the enhanced WiFi service for scanning
      const networks = await wifiService.performScan();
      setAvailableNetworks(networks);
      
      // Set current network
      const connected = networks.find(n => n.isConnected);
      if (connected) {
        setCurrentNetwork(connected);
        setConnectionStatus('connected');
        updateWiFiDiagnostics(connected);
      } else {
        setCurrentNetwork(null);
        setConnectionStatus('disconnected');
      }
      
    } catch (error) {
      console.error('WiFi scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Update WiFi diagnostics from service
  const updateWiFiDiagnostics = useCallback((network) => {
    if (!network) {
      const status = wifiService.getConnectionStatus();
      setWifiDiagnostics(status.diagnostics);
      return;
    }
    
    setWifiDiagnostics({
      signalStrength: Math.round(network.signalStrength),
      linkSpeed: network.frequency > 5000 ? 
        Math.round(network.signalStrength * 1.3) : // 5GHz bonus
        Math.round(network.signalStrength * 0.8),
      frequency: network.frequency,
      channel: network.channel,
      security: network.security,
      downlink: network.downlink || 0,
      rtt: network.rtt || 0,
      effectiveType: network.effectiveType || 'wifi',
      band: network.band || (network.frequency > 5000 ? '5GHz' : '2.4GHz')
    });
  }, []);

  // Connect to WiFi network using the enhanced service
  const connectToNetwork = useCallback(async (network, password = '') => {
    setConnectionStatus('connecting');
    
    try {
      // Check if password is required and provided
      if (network.isSecure && !password && network.security !== 'Open') {
        setConnectionStatus('password_required');
        setSelectedNetwork(network);
        setShowPasswordDialog(true);
        return false;
      }
      
      // Use the WiFi service to connect
      await wifiService.connectToNetwork(network, password);
      
      // Refresh the networks list to get updated connection status
      const updatedNetworks = await wifiService.performScan();
      setAvailableNetworks(updatedNetworks);
      
      // Find the connected network
      const connectedNetwork = updatedNetworks.find(n => n.isConnected);
      if (connectedNetwork) {
        setCurrentNetwork(connectedNetwork);
        setConnectionStatus('connected');
        setShowPasswordDialog(false);
        setNetworkPassword('');
        updateWiFiDiagnostics(connectedNetwork);
        
        // Notify parent component
        onConnectionChange?.(true);
        return true;
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('failed');
      setTimeout(() => setConnectionStatus('disconnected'), 3000);
      return false;
    }
  }, [onConnectionChange, updateWiFiDiagnostics]);

  // Disconnect from current network using the service
  const disconnectFromNetwork = useCallback(async () => {
    setConnectionStatus('disconnecting');
    
    try {
      await wifiService.disconnectFromNetwork();
      
      // Refresh the networks list
      const updatedNetworks = await wifiService.performScan();
      setAvailableNetworks(updatedNetworks);
      setCurrentNetwork(null);
      setConnectionStatus('disconnected');
      onConnectionChange?.(false);
      
    } catch (error) {
      console.error('Disconnection error:', error);
      setConnectionStatus('disconnected');
    }
  }, [onConnectionChange]);

  // Handle password submission
  const handlePasswordSubmit = () => {
    if (selectedNetwork && networkPassword) {
      connectToNetwork(selectedNetwork, networkPassword);
    }
  };

  // Perform speed test
  const performSpeedTest = useCallback(async () => {
    if (!currentNetwork) return;
    
    setIsRunningSpeedTest(true);
    try {
      const results = await wifiService.performSpeedTest();
      setSpeedTestResults(results);
    } catch (error) {
      console.error('Speed test failed:', error);
    } finally {
      setIsRunningSpeedTest(false);
    }
  }, [currentNetwork]);

  // Get connection history from service
  // eslint-disable-next-line no-unused-vars
  const updateConnectionHistory = useCallback(() => {
    const status = wifiService.getConnectionStatus();
    setConnectionHistory(status.connectionHistory);
  }, []);

  // Get signal strength icon
  const getSignalIcon = (strength) => {
    if (strength >= 80) return '📶';
    if (strength >= 60) return '📶';
    if (strength >= 40) return '📵';
    if (strength >= 20) return '📴';
    return '❌';
  };

  // Get security icon
  const getSecurityIcon = (security) => {
    switch (security) {
      case 'WPA3': return '🔒';
      case 'WPA2': return '🔒';
      case 'WPA2-Enterprise': return '🏢';
      case 'WEP': return '⚠️';
      case 'Open': return '🔓';
      default: return '❓';
    }
  };

  // Auto-scan on component mount and periodically
  useEffect(() => {
    if (isWiFiEnabled) {
      wifiService.setWiFiEnabled(true);
      performWiFiScan();
      
      // Set up periodic scanning
      scanIntervalRef.current = setInterval(performWiFiScan, 30000); // Every 30 seconds
    } else {
      wifiService.setWiFiEnabled(false);
      setAvailableNetworks([]);
      setCurrentNetwork(null);
      setConnectionStatus('disconnected');
    }
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isWiFiEnabled, performWiFiScan]);

  // Connection health monitoring
  useEffect(() => {
    if (currentNetwork && connectionStatus === 'connected') {
      connectionCheckRef.current = setInterval(() => {
        // Simulate connection quality changes
        const newStrength = Math.max(20, 
          currentNetwork.signalStrength + (Math.random() * 10 - 5)
        );
        
        const updatedNetwork = { ...currentNetwork, signalStrength: newStrength };
        setCurrentNetwork(updatedNetwork);
        updateWiFiDiagnostics(updatedNetwork);
      }, 10000); // Every 10 seconds
    }
    
    return () => {
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
    };
  }, [currentNetwork, connectionStatus, updateWiFiDiagnostics]);

  return (
    <div className="wifi-manager">
      <div className="wifi-header">
        <div className="wifi-status">
          <div className={`wifi-indicator ${isWiFiEnabled ? 'enabled' : 'disabled'}`}>
            <span className="wifi-icon">
              {isWiFiEnabled ? (currentNetwork ? '📶' : '📡') : '✈️'}
            </span>
            <span className="wifi-text">
              {!isWiFiEnabled ? 'WiFi Disabled' :
               currentNetwork ? `Connected to ${currentNetwork.ssid}` :
               'WiFi Enabled'}
            </span>
          </div>
          <button 
            className="wifi-toggle"
            onClick={() => setIsWiFiEnabled(!isWiFiEnabled)}
            title={isWiFiEnabled ? 'Disable WiFi' : 'Enable WiFi'}
          >
            {isWiFiEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {isWiFiEnabled && (
          <div className="wifi-controls">
            <button 
              className="scan-button"
              onClick={performWiFiScan}
              disabled={isScanning}
            >
              {isScanning ? '🔄 Scanning...' : '🔍 Scan'}
            </button>
            <button 
              className="networks-button"
              onClick={() => setShowNetworkList(!showNetworkList)}
            >
              📋 Networks ({availableNetworks.length})
            </button>
          </div>
        )}
      </div>

      {/* Current Connection Info */}
      {currentNetwork && (
        <div className="current-connection">
          <div className="connection-header">
            <h4>Current Connection</h4>
            <span className={`connection-status ${connectionStatus}`}>
              {connectionStatus.replace('_', ' ')}
            </span>
          </div>
          
          <div className="connection-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value">{currentNetwork.ssid}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Signal:</span>
              <span className="detail-value">
                {getSignalIcon(wifiDiagnostics.signalStrength)} {wifiDiagnostics.signalStrength}%
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Security:</span>
              <span className="detail-value">
                {getSecurityIcon(wifiDiagnostics.security)} {wifiDiagnostics.security}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Frequency:</span>
              <span className="detail-value">{wifiDiagnostics.frequency} MHz</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Channel:</span>
              <span className="detail-value">{wifiDiagnostics.channel}</span>
            </div>
            {wifiDiagnostics.downlink > 0 && (
              <div className="detail-row">
                <span className="detail-label">Speed:</span>
                <span className="detail-value">{wifiDiagnostics.downlink} Mbps</span>
              </div>
            )}
            {wifiDiagnostics.rtt > 0 && (
              <div className="detail-row">
                <span className="detail-label">Latency:</span>
                <span className="detail-value">{wifiDiagnostics.rtt} ms</span>
              </div>
            )}
          </div>
          
          <div className="connection-actions">
            <button 
              className="disconnect-button"
              onClick={disconnectFromNetwork}
              disabled={connectionStatus === 'disconnecting'}
            >
              {connectionStatus === 'disconnecting' ? 'Disconnecting...' : 'Disconnect'}
            </button>
            
            <button 
              className="speed-test-button"
              onClick={performSpeedTest}
              disabled={isRunningSpeedTest || connectionStatus !== 'connected'}
            >
              {isRunningSpeedTest ? '🔄 Testing...' : '🚀 Speed Test'}
            </button>
            
            <button 
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '📊 Hide Advanced' : '📊 Advanced'}
            </button>
          </div>
        </div>
      )}

      {/* Speed Test Results */}
      {speedTestResults && (
        <div className="speed-test-results">
          <h4>Speed Test Results</h4>
          <div className="speed-metrics">
            <div className="speed-metric">
              <span className="metric-label">Download:</span>
              <span className="metric-value">{speedTestResults.download.toFixed(1)} Mbps</span>
            </div>
            <div className="speed-metric">
              <span className="metric-label">Upload:</span>
              <span className="metric-value">{speedTestResults.upload.toFixed(1)} Mbps</span>
            </div>
            <div className="speed-metric">
              <span className="metric-label">Ping:</span>
              <span className="metric-value">{speedTestResults.ping.toFixed(0)} ms</span>
            </div>
            <div className="speed-metric">
              <span className="metric-label">Jitter:</span>
              <span className="metric-value">{speedTestResults.jitter.toFixed(1)} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Features */}
      {showAdvanced && currentNetwork && (
        <div className="advanced-features">
          <h4>Advanced Information</h4>
          <div className="advanced-details">
            <div className="detail-row">
              <span className="detail-label">BSSID:</span>
              <span className="detail-value">{currentNetwork.bssid}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Band:</span>
              <span className="detail-value">{wifiDiagnostics.band}</span>
            </div>
            {currentNetwork.realConnection && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Connection Type:</span>
                  <span className="detail-value">{currentNetwork.effectiveType}</span>
                </div>
                {currentNetwork.saveData && (
                  <div className="detail-row">
                    <span className="detail-label">Data Saver:</span>
                    <span className="detail-value">Enabled</span>
                  </div>
                )}
              </>
            )}
            <div className="detail-row">
              <span className="detail-label">Connected Since:</span>
              <span className="detail-value">
                {currentNetwork.connectedAt ? 
                  new Date(currentNetwork.connectedAt).toLocaleTimeString() : 
                  'Unknown'
                }
              </span>
            </div>
          </div>
          
          {/* Connection History */}
          <div className="connection-history">
            <h5>Recent Activity</h5>
            <div className="history-list">
              {connectionHistory.slice(0, 5).map((event, index) => (
                <div key={index} className="history-item">
                  <span className="history-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="history-message">{event.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Networks List */}
      {showNetworkList && isWiFiEnabled && (
        <div className="networks-list">
          <div className="networks-header">
            <h4>Available Networks</h4>
            {isScanning && <span className="scanning-indicator">🔄</span>}
          </div>
          
          <div className="networks-container">
            {availableNetworks.map((network, index) => (
              <div 
                key={`${network.bssid}-${index}`}
                className={`network-item ${network.isConnected ? 'connected' : ''}`}
                onClick={() => !network.isConnected && connectToNetwork(network)}
              >
                <div className="network-info">
                  <div className="network-name">
                    <span className="ssid">{network.ssid}</span>
                    {network.isConnected && <span className="connected-badge">Connected</span>}
                  </div>
                  <div className="network-details">
                    <span className="signal">
                      {getSignalIcon(network.signalStrength)} {Math.round(network.signalStrength)}%
                    </span>
                    <span className="security">
                      {getSecurityIcon(network.security)} {network.security}
                    </span>
                    <span className="frequency">
                      {network.frequency > 5000 ? '5G' : '2.4G'}
                    </span>
                  </div>
                </div>
                
                {!network.isConnected && (
                  <button className="connect-button">
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password Dialog */}
      {showPasswordDialog && selectedNetwork && (
        <div className="password-dialog-overlay">
          <div className="password-dialog">
            <div className="dialog-header">
              <h4>Connect to {selectedNetwork.ssid}</h4>
              <span className="security-info">
                {getSecurityIcon(selectedNetwork.security)} {selectedNetwork.security}
              </span>
            </div>
            
            <div className="dialog-body">
              <label htmlFor="network-password">Network Password:</label>
              <input
                id="network-password"
                type="password"
                value={networkPassword}
                onChange={(e) => setNetworkPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
              <div className="password-hint">
                Password must be at least 8 characters for WPA/WPA2 networks
              </div>
            </div>
            
            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setNetworkPassword('');
                  setConnectionStatus('disconnected');
                }}
              >
                Cancel
              </button>
              <button 
                className="connect-button"
                onClick={handlePasswordSubmit}
                disabled={!networkPassword || (selectedNetwork.security !== 'Open' && networkPassword.length < 8)}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WiFiManager;
