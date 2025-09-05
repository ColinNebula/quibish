// Enhanced WiFi Service - Provides realistic WiFi functionality within browser constraints
class WiFiService {
  constructor() {
    this.isEnabled = true;
    this.currentConnection = null;
    this.availableNetworks = [];
    this.connectionHistory = [];
    this.diagnostics = {
      signalStrength: 0,
      linkSpeed: 0,
      frequency: 0,
      channel: 0,
      security: 'none',
      lastScan: 0
    };
    
    // Initialize with real network detection where possible
    this.initializeRealNetworkDetection();
  }

  // Initialize real network detection using available browser APIs
  async initializeRealNetworkDetection() {
    try {
      // Network Information API
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          this.realNetworkInfo = {
            type: connection.type,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          };
          
          // Listen for network changes
          connection.addEventListener('change', () => {
            this.handleNetworkChange();
          });
        }
      }

      // Online/Offline detection
      window.addEventListener('online', () => this.handleOnlineStateChange(true));
      window.addEventListener('offline', () => this.handleOnlineStateChange(false));

      // Performance-based quality detection
      this.setupPerformanceMonitoring();

    } catch (error) {
      console.warn('Real network detection setup failed:', error);
    }
  }

  // Setup performance monitoring for connection quality
  setupPerformanceMonitoring() {
    // Monitor page load performance
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.updateConnectionQualityFromPerformance(entry);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
      } catch (e) {
        console.debug('Performance observer not fully supported');
      }
    }
  }

  // Update connection quality based on performance metrics
  updateConnectionQualityFromPerformance(entry) {
    const totalTime = entry.loadEventEnd - entry.navigationStart;
    // eslint-disable-next-line no-unused-vars
    const dnsTime = entry.domainLookupEnd - entry.domainLookupStart;
    const connectTime = entry.connectEnd - entry.connectStart;
    
    // Estimate signal strength based on performance
    let estimatedStrength = 50; // Default
    
    if (totalTime < 2000 && connectTime < 200) {
      estimatedStrength = 90; // Excellent
    } else if (totalTime < 5000 && connectTime < 500) {
      estimatedStrength = 75; // Good
    } else if (totalTime < 10000 && connectTime < 1000) {
      estimatedStrength = 60; // Fair
    } else {
      estimatedStrength = 40; // Poor
    }
    
    this.diagnostics.signalStrength = estimatedStrength;
    this.diagnostics.lastUpdate = Date.now();
  }

  // Handle network information changes
  handleNetworkChange() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this.realNetworkInfo = {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
      
      // Update current connection if connected
      if (this.currentConnection) {
        this.updateCurrentConnectionFromReal();
      }
    }
  }

  // Handle online/offline state changes
  handleOnlineStateChange(isOnline) {
    if (!isOnline && this.currentConnection) {
      this.addConnectionEvent('Connection lost - device offline');
      this.diagnostics.signalStrength = 0;
    } else if (isOnline && !this.currentConnection) {
      this.addConnectionEvent('Device back online - scanning for networks');
      this.performScan();
    }
  }

  // Update current connection with real network info
  updateCurrentConnectionFromReal() {
    if (!this.currentConnection || !this.realNetworkInfo) return;
    
    // Map real network info to our connection
    if (this.realNetworkInfo.downlink) {
      this.currentConnection.downlink = this.realNetworkInfo.downlink;
      this.diagnostics.linkSpeed = Math.round(this.realNetworkInfo.downlink);
    }
    
    if (this.realNetworkInfo.rtt) {
      this.currentConnection.rtt = this.realNetworkInfo.rtt;
    }
    
    if (this.realNetworkInfo.effectiveType) {
      this.currentConnection.effectiveType = this.realNetworkInfo.effectiveType;
      
      // Estimate signal strength from connection type
      switch (this.realNetworkInfo.effectiveType) {
        case '4g':
          this.diagnostics.signalStrength = Math.max(80, this.diagnostics.signalStrength);
          break;
        case '3g':
          this.diagnostics.signalStrength = Math.max(60, this.diagnostics.signalStrength);
          break;
        case '2g':
          this.diagnostics.signalStrength = Math.max(40, this.diagnostics.signalStrength);
          break;
        case 'slow-2g':
          this.diagnostics.signalStrength = Math.max(20, this.diagnostics.signalStrength);
          break;
        default:
          // No specific action for unknown connection types
          break;
      }
    }
  }

  // Enhanced network scanning with geolocation and real data
  async performScan() {
    if (!this.isEnabled) return [];
    
    try {
      this.diagnostics.lastScan = Date.now();
      
      // Get enhanced location info if available (helps detect WiFi vs cellular)
      let locationData = null;
      try {
        if ('geolocation' in navigator) {
          locationData = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              position => resolve(position),
              error => reject(error),
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
          });
        }
      } catch (e) {
        console.debug('Geolocation not available for network scanning');
      }
      
      // Generate realistic network list based on location and real network info
      const networks = this.generateNetworkList(locationData);
      
      // Update with real network information where available
      this.enhanceNetworksWithRealData(networks);
      
      this.availableNetworks = networks;
      return networks;
      
    } catch (error) {
      console.error('Network scan failed:', error);
      return [];
    }
  }

  // Generate realistic network list
  generateNetworkList(locationData) {
    const baseNetworks = [
      {
        ssid: 'Home_Network_5G',
        bssid: '00:11:22:33:44:55',
        security: 'WPA2',
        signalStrength: 85,
        frequency: 5180,
        channel: 36,
        band: '5GHz',
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
        band: '2.4GHz',
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
        band: '2.4GHz',
        isConnected: false,
        isSecure: false
      },
      {
        ssid: 'Office_Network',
        bssid: '11:22:33:44:55:66',
        security: 'WPA2-Enterprise',
        signalStrength: 65,
        frequency: 5240,
        channel: 48,
        band: '5GHz',
        isConnected: false,
        isSecure: true
      }
    ];
    
    // Add location-based variations
    if (locationData && locationData.coords.accuracy < 100) {
      // High accuracy suggests indoor/WiFi environment
      baseNetworks.forEach(network => {
        network.signalStrength = Math.min(95, network.signalStrength + 10);
      });
      
      // Add more local networks
      baseNetworks.push({
        ssid: 'Neighbor_WiFi',
        bssid: 'aa:bb:cc:dd:ee:ff',
        security: 'WPA3',
        signalStrength: Math.floor(Math.random() * 40) + 30,
        frequency: 5180,
        channel: 36,
        band: '5GHz',
        isConnected: false,
        isSecure: true
      });
    }
    
    // Add random variations to signal strength
    return baseNetworks.map(network => ({
      ...network,
      signalStrength: Math.max(10, Math.min(95, 
        network.signalStrength + (Math.random() * 10 - 5)
      )),
      lastSeen: Date.now()
    }));
  }

  // Enhance networks with real data where available
  enhanceNetworksWithRealData(networks) {
    if (!this.realNetworkInfo) return;
    
    const connectedNetwork = networks.find(n => n.isConnected);
    if (connectedNetwork && this.realNetworkInfo) {
      connectedNetwork.realConnection = true;
      connectedNetwork.downlink = this.realNetworkInfo.downlink;
      connectedNetwork.rtt = this.realNetworkInfo.rtt;
      connectedNetwork.effectiveType = this.realNetworkInfo.effectiveType;
      connectedNetwork.saveData = this.realNetworkInfo.saveData;
      
      // Adjust signal strength based on real connection quality
      if (this.realNetworkInfo.effectiveType === '4g' && this.realNetworkInfo.downlink > 10) {
        connectedNetwork.signalStrength = Math.max(connectedNetwork.signalStrength, 85);
      } else if (this.realNetworkInfo.effectiveType === '4g') {
        connectedNetwork.signalStrength = Math.max(connectedNetwork.signalStrength, 70);
      } else if (this.realNetworkInfo.effectiveType === '3g') {
        connectedNetwork.signalStrength = Math.max(connectedNetwork.signalStrength, 55);
      }
    }
  }

  // Connect to a network (simulated)
  async connectToNetwork(network, password = '') {
    try {
      // Validate password for secure networks
      if (network.isSecure && network.security !== 'Open') {
        if (!password || password.length < 8) {
          throw new Error('Invalid password for secure network');
        }
      }
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      
      // Disconnect from current network
      if (this.currentConnection) {
        this.currentConnection.isConnected = false;
      }
      
      // Connect to new network
      network.isConnected = true;
      network.connectedAt = Date.now();
      this.currentConnection = network;
      
      // Update diagnostics
      this.updateDiagnosticsFromNetwork(network);
      
      // Add to connection history
      this.addConnectionEvent(`Connected to ${network.ssid}`);
      
      // Update real network info if available
      this.updateCurrentConnectionFromReal();
      
      return true;
      
    } catch (error) {
      this.addConnectionEvent(`Failed to connect to ${network.ssid}: ${error.message}`);
      throw error;
    }
  }

  // Disconnect from current network
  async disconnectFromNetwork() {
    if (!this.currentConnection) return;
    
    const networkName = this.currentConnection.ssid;
    this.currentConnection.isConnected = false;
    this.currentConnection = null;
    
    // Reset diagnostics
    this.diagnostics = {
      signalStrength: 0,
      linkSpeed: 0,
      frequency: 0,
      channel: 0,
      security: 'none'
    };
    
    this.addConnectionEvent(`Disconnected from ${networkName}`);
  }

  // Update diagnostics from network
  updateDiagnosticsFromNetwork(network) {
    this.diagnostics = {
      signalStrength: Math.round(network.signalStrength),
      linkSpeed: network.frequency > 5000 ? 
        Math.round(network.signalStrength * 1.3) : 
        Math.round(network.signalStrength * 0.8),
      frequency: network.frequency,
      channel: network.channel,
      security: network.security,
      band: network.band,
      lastUpdate: Date.now()
    };
  }

  // Add connection event to history
  addConnectionEvent(message) {
    this.connectionHistory.unshift({
      timestamp: Date.now(),
      message: message
    });
    
    // Keep only last 10 events
    if (this.connectionHistory.length > 10) {
      this.connectionHistory = this.connectionHistory.slice(0, 10);
    }
  }

  // Get current connection status
  getConnectionStatus() {
    return {
      isConnected: !!this.currentConnection,
      currentNetwork: this.currentConnection,
      diagnostics: this.diagnostics,
      availableNetworks: this.availableNetworks,
      connectionHistory: this.connectionHistory,
      realNetworkInfo: this.realNetworkInfo
    };
  }

  // Enable/disable WiFi
  setWiFiEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled && this.currentConnection) {
      this.disconnectFromNetwork();
    }
    this.addConnectionEvent(`WiFi ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get network quality assessment
  getNetworkQuality() {
    if (!this.currentConnection) return 'disconnected';
    
    const signal = this.diagnostics.signalStrength;
    
    if (signal >= 80) return 'excellent';
    if (signal >= 60) return 'good';
    if (signal >= 40) return 'fair';
    if (signal >= 20) return 'poor';
    return 'very-poor';
  }

  // Perform speed test simulation
  async performSpeedTest() {
    if (!this.currentConnection) {
      throw new Error('No active connection for speed test');
    }
    
    const results = {
      download: 0,
      upload: 0,
      ping: 0,
      jitter: 0
    };
    
    // Simulate speed test based on signal strength and real network info
    const baseSpeed = this.diagnostics.signalStrength * 0.8; // Max ~76 Mbps for 95% signal
    
    if (this.realNetworkInfo && this.realNetworkInfo.downlink) {
      results.download = Math.min(this.realNetworkInfo.downlink, baseSpeed);
    } else {
      results.download = baseSpeed + (Math.random() * 10 - 5);
    }
    
    results.upload = results.download * 0.7; // Upload typically slower
    
    if (this.realNetworkInfo && this.realNetworkInfo.rtt) {
      results.ping = this.realNetworkInfo.rtt;
    } else {
      results.ping = Math.max(5, 100 - this.diagnostics.signalStrength + (Math.random() * 20 - 10));
    }
    
    results.jitter = Math.max(1, results.ping * 0.1 + (Math.random() * 5));
    
    return results;
  }
}

// Create singleton instance
const wifiService = new WiFiService();

export default wifiService;
