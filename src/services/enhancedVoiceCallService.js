// Enhanced Voice Call Service - Complete Implementation
class EnhancedVoiceCallService {
  constructor() {
    this.currentCall = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallActive = false;
    this.isMuted = false;
    this.isVideoEnabled = false;
    this.callHistory = [];
  }

  // Initialize WebRTC
  async initializeCall(targetUserId, options = {}) {
    try {
      const { video = false, audio = true } = options;
      
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio
      });
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
      };
      
      this.currentCall = {
        id: Date.now().toString(),
        targetUserId,
        startTime: new Date(),
        type: video ? 'video' : 'voice',
        status: 'initializing'
      };
      
      this.isCallActive = true;
      this.isVideoEnabled = video;
      
      return {
        success: true,
        callId: this.currentCall.id,
        localStream: this.localStream
      };
    } catch (error) {
      console.error('Call initialization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // End current call
  async endCall() {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      if (this.currentCall) {
        this.currentCall.endTime = new Date();
        this.currentCall.duration = this.currentCall.endTime - this.currentCall.startTime;
        this.currentCall.status = 'ended';
        
        // Add to call history
        this.callHistory.push({ ...this.currentCall });
        
        this.currentCall = null;
      }
      
      this.isCallActive = false;
      this.isMuted = false;
      this.isVideoEnabled = false;
      
      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error: error.message };
    }
  }

  // Toggle mute
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
      }
    }
    return this.isMuted;
  }

  // Toggle video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoEnabled = videoTrack.enabled;
      }
    }
    return this.isVideoEnabled;
  }

  // Get current call state
  getCallState() {
    return {
      active: this.isCallActive,
      muted: this.isMuted,
      videoEnabled: this.isVideoEnabled,
      currentCall: this.currentCall,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream
    };
  }

  // Get call history
  getCallHistory() {
    return this.callHistory;
  }

  // Accept incoming call
  async acceptCall(callData) {
    try {
      const result = await this.initializeCall(callData.callerId, {
        video: callData.hasVideo,
        audio: true
      });
      
      if (result.success) {
        this.currentCall.status = 'active';
        this.currentCall.type = 'incoming';
      }
      
      return result;
    } catch (error) {
      console.error('Error accepting call:', error);
      return { success: false, error: error.message };
    }
  }

  // Reject incoming call
  rejectCall(callData) {
    // Add to call history as rejected
    this.callHistory.push({
      id: callData.id,
      targetUserId: callData.callerId,
      startTime: new Date(callData.timestamp),
      endTime: new Date(),
      type: 'incoming',
      status: 'rejected',
      duration: 0
    });
    
    return { success: true };
  }

  // Check device capabilities
  async checkDeviceCapabilities() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      return {
        camera: hasCamera,
        microphone: hasMicrophone,
        webRTC: !!window.RTCPeerConnection
      };
    } catch (error) {
      console.error('Error checking device capabilities:', error);
      return {
        camera: false,
        microphone: false,
        webRTC: false,
        error: error.message
      };
    }
  }
}

export default new EnhancedVoiceCallService();