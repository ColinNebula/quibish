/**
 * P2P Messaging Service - WebRTC Data Channel Implementation
 * Enables completely free, direct peer-to-peer text messaging
 * No server costs - messages sent directly between devices
 */

class P2PMessagingService {
  constructor() {
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.dataChannels = new Map(); // userId -> RTCDataChannel
    this.messageQueue = new Map(); // userId -> Array of pending messages
    this.listeners = new Map();
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' }
    ];
    this.connectionState = new Map(); // userId -> connection status
  }

  /**
   * Initialize P2P connection with a peer
   */
  async connectToPeer(peerId, isInitiator = false) {
    try {
      console.log(`🔗 Connecting to peer ${peerId} (initiator: ${isInitiator})`);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: this.iceServers
      });

      this.peerConnections.set(peerId, pc);
      this.connectionState.set(peerId, 'connecting');

      // Set up ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this._emit('ice-candidate', {
            peerId,
            candidate: event.candidate
          });
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`🔗 Connection state with ${peerId}: ${state}`);
        this.connectionState.set(peerId, state);
        
        if (state === 'connected') {
          this._emit('peer-connected', { peerId });
          this._processPendingMessages(peerId);
        } else if (state === 'disconnected' || state === 'failed') {
          this._emit('peer-disconnected', { peerId });
        }
      };

      // Create data channel if initiator
      if (isInitiator) {
        const dataChannel = pc.createDataChannel('messaging', {
          ordered: true,
          maxRetransmits: 3
        });
        
        this._setupDataChannel(dataChannel, peerId);
        
        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this._emit('offer', {
          peerId,
          offer: pc.localDescription
        });
      } else {
        // Wait for data channel from peer
        pc.ondatachannel = (event) => {
          this._setupDataChannel(event.channel, peerId);
        };
      }

      return { success: true, peerId };
    } catch (error) {
      console.error(`❌ Failed to connect to peer ${peerId}:`, error);
      this.connectionState.set(peerId, 'failed');
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up data channel for messaging
   */
  _setupDataChannel(channel, peerId) {
    this.dataChannels.set(peerId, channel);

    channel.onopen = () => {
      console.log(`✅ Data channel with ${peerId} is open`);
      this._emit('channel-ready', { peerId });
      this._processPendingMessages(peerId);
    };

    channel.onclose = () => {
      console.log(`❌ Data channel with ${peerId} closed`);
      this.dataChannels.delete(peerId);
    };

    channel.onerror = (error) => {
      console.error(`❌ Data channel error with ${peerId}:`, error);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._emit('message', {
          ...message,
          peerId,
          timestamp: message.timestamp || new Date().toISOString(),
          p2p: true
        });
      } catch (error) {
        console.error('❌ Failed to parse message:', error);
      }
    };
  }

  /**
   * Send text message via P2P data channel
   */
  async sendMessage(peerId, messageData) {
    const channel = this.dataChannels.get(peerId);
    
    const message = {
      id: Date.now().toString(),
      text: messageData.text,
      timestamp: new Date().toISOString(),
      type: messageData.type || 'text',
      ...messageData
    };

    if (channel && channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify(message));
        console.log(`📤 Sent P2P message to ${peerId}:`, message);
        return { success: true, message };
      } catch (error) {
        console.error(`❌ Failed to send message to ${peerId}:`, error);
        this._queueMessage(peerId, message);
        return { success: false, queued: true };
      }
    } else {
      // Queue message for later
      this._queueMessage(peerId, message);
      console.log(`⏳ Queued message for ${peerId} (channel not ready)`);
      return { success: false, queued: true };
    }
  }

  /**
   * Queue message for later delivery
   */
  _queueMessage(peerId, message) {
    if (!this.messageQueue.has(peerId)) {
      this.messageQueue.set(peerId, []);
    }
    this.messageQueue.get(peerId).push(message);
  }

  /**
   * Process pending messages once channel is ready
   */
  async _processPendingMessages(peerId) {
    const queue = this.messageQueue.get(peerId);
    if (!queue || queue.length === 0) return;

    console.log(`📤 Processing ${queue.length} pending messages for ${peerId}`);
    
    const channel = this.dataChannels.get(peerId);
    if (!channel || channel.readyState !== 'open') return;

    while (queue.length > 0) {
      const message = queue.shift();
      try {
        channel.send(JSON.stringify(message));
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between messages
      } catch (error) {
        console.error(`❌ Failed to send queued message:`, error);
        queue.unshift(message); // Put it back
        break;
      }
    }
  }

  /**
   * Handle incoming offer from peer
   */
  async handleOffer(peerId, offer) {
    try {
      await this.connectToPeer(peerId, false);
      const pc = this.peerConnections.get(peerId);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this._emit('answer', {
        peerId,
        answer: pc.localDescription
      });
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to handle offer from ${peerId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle incoming answer from peer
   */
  async handleAnswer(peerId, answer) {
    try {
      const pc = this.peerConnections.get(peerId);
      if (!pc) {
        throw new Error('No peer connection found');
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to handle answer from ${peerId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(peerId, candidate) {
    try {
      const pc = this.peerConnections.get(peerId);
      if (!pc) {
        console.warn(`⚠️ No peer connection for ${peerId}`);
        return;
      }
      
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`❌ Failed to add ICE candidate:`, error);
    }
  }

  /**
   * Get connection status with peer
   */
  getConnectionStatus(peerId) {
    return this.connectionState.get(peerId) || 'disconnected';
  }

  /**
   * Check if P2P messaging is available
   */
  isAvailable() {
    return !!(
      window.RTCPeerConnection &&
      window.RTCDataChannel &&
      navigator.mediaDevices
    );
  }

  /**
   * Disconnect from peer
   */
  disconnectPeer(peerId) {
    const pc = this.peerConnections.get(peerId);
    const channel = this.dataChannels.get(peerId);
    
    if (channel) {
      channel.close();
      this.dataChannels.delete(peerId);
    }
    
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    
    this.connectionState.delete(peerId);
    this.messageQueue.delete(peerId);
    
    console.log(`🔌 Disconnected from peer ${peerId}`);
  }

  /**
   * Disconnect all peers
   */
  disconnectAll() {
    for (const peerId of this.peerConnections.keys()) {
      this.disconnectPeer(peerId);
    }
  }

  /**
   * Event subscription system
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  _emit(event, data) {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`❌ Event handler error (${event}):`, error);
      }
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalConnections: this.peerConnections.size,
      activeChannels: this.dataChannels.size,
      queuedMessages: Array.from(this.messageQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      connections: Array.from(this.connectionState.entries()).map(([peerId, state]) => ({
        peerId,
        state,
        hasDataChannel: this.dataChannels.has(peerId)
      }))
    };
  }
}

// Lazy initialization to avoid circular dependency issues at startup
let instance = null;

export default {
  getInstance() {
    if (!instance) {
      instance = new P2PMessagingService();
    }
    return instance;
  },
  
  // Forward common methods for backward compatibility
  connectToPeer(peerId, isInitiator) {
    return this.getInstance().connectToPeer(peerId, isInitiator);
  },
  
  disconnectFromPeer(peerId) {
    return this.getInstance().disconnectFromPeer(peerId);
  },
  
  sendMessage(peerId, message) {
    return this.getInstance().sendMessage(peerId, message);
  },
  
  on(event, callback) {
    return this.getInstance().on(event, callback);
  },
  
  off(event, callback) {
    return this.getInstance().off(event, callback);
  },
  
  getStatus() {
    return this.getInstance().getStatus();
  }
};
