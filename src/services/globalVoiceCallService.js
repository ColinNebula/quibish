/**
 * Global Voice Call Service
 * Implements WebRTC peer-to-peer voice calling for worldwide connectivity
 */

class GlobalVoiceCallService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.socket = null;
    this.activeCall = null;
    this.onlineUsers = new Map();
    this.isConnected = false;
    
    // WebRTC configuration with public STUN servers
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free TURN servers for better connectivity
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };

    this.initializeSignaling();
  }

  /**
   * Initialize WebSocket signaling connection
   */
  initializeSignaling() {
    try {
      // Skip WebSocket connection in development for now
      if (process.env.NODE_ENV !== 'production') {
        console.log('Skipping WebSocket signaling in development, using local fallback');
        this.setupLocalFallback();
        return;
      }

      // Connect to signaling server (will fallback if backend not available)
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://your-domain.com/signaling'
        : 'ws://localhost:5001/signaling';
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('Global voice call signaling connected');
        this.isConnected = true;
        this.registerUser();
      };

      this.socket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };

      this.socket.onclose = () => {
        console.log('Signaling connection closed, attempting reconnect...');
        this.isConnected = false;
        setTimeout(() => this.initializeSignaling(), 3000);
      };

      this.socket.onerror = (error) => {
        console.warn('Signaling error, using local fallback:', error);
        this.setupLocalFallback();
      };

    } catch (error) {
      console.warn('WebSocket not available, using local fallback:', error);
      this.setupLocalFallback();
    }
  }

  /**
   * Setup local fallback for testing without backend
   */
  setupLocalFallback() {
    this.isConnected = false;
    console.log('Using local fallback mode for voice calls');
  }

  /**
   * Register current user with signaling server
   */
  registerUser() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'register',
        userId: user.id || 'anonymous',
        userData: {
          name: user.name || 'Anonymous User',
          avatar: user.avatar,
          location: 'Unknown'
        }
      }));
    }
  }

  /**
   * Handle incoming signaling messages
   */
  handleSignalingMessage(message) {
    switch (message.type) {
      case 'user-list':
        this.updateOnlineUsers(message.users);
        break;
      case 'call-offer':
        this.handleIncomingCall(message);
        break;
      case 'call-answer':
        this.handleCallAnswer(message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message);
        break;
      case 'call-end':
        this.handleCallEnd(message);
        break;
      case 'user-joined':
        this.onlineUsers.set(message.userId, message.userData);
        break;
      case 'user-left':
        this.onlineUsers.delete(message.userId);
        break;
      default:
        console.log('Unknown signaling message:', message);
    }
  }

  /**
   * Update list of online users
   */
  updateOnlineUsers(users) {
    this.onlineUsers.clear();
    users.forEach(user => {
      this.onlineUsers.set(user.id, user);
    });
  }

  /**
   * Get list of users available for calls
   */
  getAvailableUsers() {
    return Array.from(this.onlineUsers.values()).filter(user => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id !== currentUser.id;
    });
  }

  /**
   * Initiate a voice call to another user
   */
  async initiateCall(targetUserId) {
    try {
      const targetUser = this.onlineUsers.get(targetUserId);
      if (!targetUser) {
        throw new Error('Target user not found or offline');
      }

      // Get user media (audio only for voice calls)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);
      this.setupPeerConnectionHandlers();

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'call-offer',
          targetUserId: targetUserId,
          offer: offer,
          callId: this.generateCallId()
        }));
      } else {
        // Local fallback - simulate call
        return this.simulateLocalCall(targetUser);
      }

      this.activeCall = {
        id: this.generateCallId(),
        targetUser: targetUser,
        status: 'calling',
        startTime: Date.now(),
        type: 'outgoing'
      };

      return this.activeCall;

    } catch (error) {
      console.error('Failed to initiate call:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Handle incoming call offer
   */
  async handleIncomingCall(message) {
    try {
      const confirmed = window.confirm(
        `Incoming voice call from ${message.callerName || 'Unknown User'}. Accept?`
      );

      if (!confirmed) {
        this.rejectCall(message.callId);
        return;
      }

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);
      this.setupPeerConnectionHandlers();

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Set remote description and create answer
      await this.peerConnection.setRemoteDescription(message.offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'call-answer',
          callId: message.callId,
          answer: answer
        }));
      }

      this.activeCall = {
        id: message.callId,
        targetUser: message.callerData,
        status: 'connected',
        startTime: Date.now(),
        type: 'incoming'
      };

    } catch (error) {
      console.error('Failed to handle incoming call:', error);
      this.rejectCall(message.callId);
    }
  }

  /**
   * Handle call answer
   */
  async handleCallAnswer(message) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(message.answer);
        if (this.activeCall) {
          this.activeCall.status = 'connected';
          this.activeCall.connectedTime = Date.now();
        }
      }
    } catch (error) {
      console.error('Failed to handle call answer:', error);
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(message) {
    try {
      if (this.peerConnection && message.candidate) {
        await this.peerConnection.addIceCandidate(message.candidate);
      }
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  }

  /**
   * Setup peer connection event handlers
   */
  setupPeerConnectionHandlers() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          callId: this.activeCall?.id
        }));
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.playRemoteStream();
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('Connection state:', state);
      
      if (state === 'connected' && this.activeCall) {
        this.activeCall.status = 'connected';
      } else if (state === 'disconnected' || state === 'failed') {
        this.endCall();
      }
    };
  }

  /**
   * Play remote audio stream
   */
  playRemoteStream() {
    if (this.remoteStream) {
      const audioElement = document.createElement('audio');
      audioElement.srcObject = this.remoteStream;
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
    }
  }

  /**
   * End the current call
   */
  endCall() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.activeCall) {
      this.socket.send(JSON.stringify({
        type: 'call-end',
        callId: this.activeCall.id
      }));
    }

    this.cleanup();
  }

  /**
   * Reject incoming call
   */
  rejectCall(callId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'call-reject',
        callId: callId
      }));
    }
  }

  /**
   * Handle call end
   */
  handleCallEnd(message) {
    this.cleanup();
  }

  /**
   * Cleanup call resources
   */
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteStream) {
      this.remoteStream = null;
    }

    // Remove any audio elements
    document.querySelectorAll('audio[src*="blob:"]').forEach(audio => {
      audio.remove();
    });

    this.activeCall = null;
  }

  /**
   * Generate unique call ID
   */
  generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate local call for testing without backend
   */
  simulateLocalCall(targetUser) {
    const callId = this.generateCallId();
    
    setTimeout(() => {
      const connected = window.confirm(
        `Simulating call to ${targetUser.name}. Simulate successful connection?`
      );
      
      if (connected) {
        this.activeCall = {
          id: callId,
          targetUser: targetUser,
          status: 'connected',
          startTime: Date.now(),
          type: 'simulated',
          isSimulated: true
        };
        console.log('Simulated call connected:', this.activeCall);
      } else {
        this.activeCall = null;
      }
    }, 2000);

    return {
      id: callId,
      targetUser: targetUser,
      status: 'calling',
      startTime: Date.now(),
      type: 'simulated'
    };
  }

  /**
   * Get current call status
   */
  getCallStatus() {
    return this.activeCall;
  }

  /**
   * Check if user can make calls (has microphone access)
   */
  async canMakeCalls() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      onlineUsers: this.onlineUsers.size,
      hasActiveCall: !!this.activeCall,
      connectionMode: this.isConnected ? 'global' : 'local'
    };
  }
}

// Export singleton instance
const globalVoiceCallService = new GlobalVoiceCallService();
export default globalVoiceCallService;